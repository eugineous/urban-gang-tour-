import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

type State={values:unknown[];refs:Array<{current:unknown}>;effects:Array<()=>void|(()=>void)>};
const hooks=vi.hoisted(()=>({active:null as State|null,index:0,refIndex:0}));
vi.mock('react',async original=>{
 const actual=await original<typeof import('react')>();
 return {...actual,
  useState:(initial:unknown)=>{
   if(!hooks.active)return actual.useState(initial);
   const state=hooks.active,index=hooks.index++;
   if(!(index in state.values))state.values[index]=typeof initial==='function'?initial():initial;
   return [state.values[index],(value:unknown)=>{state.values[index]=typeof value==='function'?value(state.values[index]):value}];
  },
  useRef:(initial:unknown)=>{if(!hooks.active)return actual.useRef(initial);const state=hooks.active,index=hooks.refIndex++;return state.refs[index]??(state.refs[index]={current:initial});},
  useEffect:(effect:()=>void|(()=>void))=>{if(!hooks.active)return actual.useEffect(effect);hooks.active.effects.push(effect);},
  useContext:(context:Parameters<typeof actual.useContext>[0])=>hooks.active?{locale:'en'}:actual.useContext(context),
 };
});
import {LiveCommerce} from '@/app/_components/LiveCommerce';
import {PAYSTACK_ATTEMPT_KEY,rememberPaystackOrder} from '@/lib/client/paystack-checkout-attempt';
import {CHECKOUT_ATTEMPT_KEY} from '@/lib/client/checkout-attempt';

type Props={children?:ReactNode;onSubmit?:(event:{preventDefault:()=>void})=>Promise<void>;onChange?:(event:{target:{value:string}})=>void;value?:string;name?:string;href?:string;[key:string]:unknown};
function nodes(node:ReactNode):ReactElement<Props>[] {
 const found:ReactElement<Props>[]=[];
 Children.forEach(node,child=>{if(isValidElement<Props>(child))found.push(child,...nodes(child.props.children))});
 return found;
}
function render(state:State,component:()=>ReactNode){hooks.active=state;hooks.index=0;hooks.refIndex=0;state.effects=[];try{return component()}finally{hooks.active=null}}
const state=():State=>({values:[],refs:[],effects:[]});
const product={id:'cb-fixture',name:'Fixture merchandise',price:3500,made_to_order:true,stock:null,variants:[{label:'Black / M',priceAdjustment:0,stock:null}]};
const items=[{id:'cb-fixture',qty:1,variant:'Black / M'}];
const key='a'.repeat(32),url='https://checkout.paystack.com/recover_fixture';
let data:Map<string,string>,sessionData:Map<string,string>;
let requests:Array<{path:string;body:Record<string,unknown>|null}>;
let replies:Record<string,()=>Promise<Response>>;
const assign=vi.fn();
const response=(body:object,status=200)=>new Response(JSON.stringify(body),{status});
beforeEach(()=>{
 data=new Map([['ugt-live-cart-v1',JSON.stringify(items)]]);sessionData=new Map();requests=[];assign.mockReset();
 const storage=(values:Map<string,string>)=>({getItem:(name:string)=>values.get(name)||null,setItem:(name:string,value:string)=>values.set(name,value),removeItem:(name:string)=>values.delete(name)});
 vi.stubGlobal('localStorage',storage(data));vi.stubGlobal('sessionStorage',storage(sessionData));
 vi.stubGlobal('window',{location:{assign},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>true});
 vi.stubGlobal('location',{search:''});
 replies={
  '/api/site-data/products':async()=>response({ok:true,products:[product]}),
  '/api/site-data/events':async()=>response({ok:true,events:[{id:'EVT-FIXTURE',name:'Fixture event',sellable:true,tiers:[{name:'Standard',price:900,sellable:true}]}]}),
  '/api/checkout/fulfillment':async()=>response({pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null}}),
  '/api/checkout/session':async()=>response({ok:true,created:false}),
  '/api/checkout/recovery':async()=>response({error:'attempt_not_found'},404),
  '/api/paystack/checkout':async()=>response({ok:true,id:'ORD-CARD',orderId:'ORD-CARD',total:3500,attemptState:'ready',authorizationUrl:url}),
 };
 // No request may leave this test: unexpected paths fail closed.
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  requests.push({path,body:init?.body?JSON.parse(String(init.body)):null});
  if(!replies[path])throw Error('Unexpected network path: '+path);
  return replies[path]();
 });
});
afterEach(()=>{hooks.active=null;vi.unstubAllGlobals()});

async function checkout(eventId?:string){
 const shell=state(),client=state();
 let shellTree=render(shell,()=>LiveCommerce({view:'checkout',eventId}));
 for(const effect of shell.effects)effect();
 shellTree=render(shell,()=>LiveCommerce({view:'checkout',eventId}));
 const child=nodes(shellTree).find(node=>typeof node.type==='function'&&node.type.name==='CommerceClient')!;
 const component=()=> (child.type as (props:Props)=>ReactNode)(child.props);
 let tree=render(client,component);
 const cleanup=client.effects.map(effect=>effect());
 await vi.waitFor(()=>{tree=render(client,component);expect(nodes(tree).some(node=>node.type==='form')).toBe(true)});
 function rerender(){tree=render(client,component);return tree}
 function method(value:string){
  const select=nodes(tree).find(node=>node.type==='select'&&nodes(node.props.children).some(option=>option.type==='option'&&option.props.value==='card'))!;
  select.props.onChange!({target:{value}});rerender();
 }
 async function submit(){await nodes(tree).find(node=>node.type==='form')!.props.onSubmit!({preventDefault:()=>{}});rerender()}
 return {method,submit,html:()=>renderToStaticMarkup(tree),tree:()=>tree,cleanup:()=>cleanup.forEach(stop=>{if(typeof stop==='function')stop()})};
}

it('submits merchandise card checkout with its persisted idempotency key',async()=>{
 const page=await checkout();page.method('card');await page.submit();
 const submitted=requests.find(request=>request.path==='/api/paystack/checkout')!;
 expect(submitted.body).toMatchObject({items,fulfillment:{method:'pickup'},idempotencyKey:expect.stringMatching(/^[A-Za-z0-9_-]{32,128}$/)});
 expect(JSON.parse(data.get(PAYSTACK_ATTEMPT_KEY)!)).toEqual({key:submitted.body!.idempotencyKey,orderId:'ORD-CARD',state:'ready'});
 expect(assign).toHaveBeenCalledWith(url);expect(JSON.parse(sessionData.get('ugt-checkout-order')!)).toEqual({id:'ORD-CARD',items});page.cleanup();
});
it('opens an existing ready card URL instead of submitting another checkout',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','ready');
 replies['/api/checkout/recovery']=async()=>response({ok:true,id:'ORD-CARD',total:3500,attemptState:'ready',paymentStatus:'pending',authorizationUrl:url});
 const page=await checkout();page.method('card');
 expect(page.html()).toContain('/pay/success?ref=ORD-CARD');await page.submit();
 expect(assign).toHaveBeenCalledWith(url);expect(requests.some(request=>request.path==='/api/paystack/checkout')).toBe(false);
 expect(requests.find(request=>request.path==='/api/checkout/recovery')?.body).toEqual({key,provider:'paystack'});page.cleanup();
});
it.each(['initiating','unknown','ready'])('sends unresolved recovered %s card checkout to its status reference without initiation',async attemptState=>{
 rememberPaystackOrder(key,'ORD-CARD',attemptState);
 replies['/api/checkout/recovery']=async()=>response({ok:true,id:'ORD-CARD',total:3500,attemptState,paymentStatus:'pending'});
 const page=await checkout();page.method('card');await page.submit();
 expect(assign).toHaveBeenCalledWith('/pay/success?ref=ORD-CARD');expect(requests.some(request=>request.path==='/api/paystack/checkout'||request.path==='/api/stripe/checkout')).toBe(false);page.cleanup();
});
it('resubmits only a recovered prepared card checkout with the original key',async()=>{
 rememberPaystackOrder(key,'ORD-CARD','prepared');
 replies['/api/checkout/recovery']=async()=>response({ok:true,id:'ORD-CARD',total:3500,attemptState:'prepared',paymentStatus:'pending'});
 const page=await checkout();page.method('card');await page.submit();
 expect(requests.find(request=>request.path==='/api/paystack/checkout')?.body?.idempotencyKey).toBe(key);expect(assign).toHaveBeenCalledWith(url);page.cleanup();
});
it.each([
 ['paid','ready'],['fulfilled','ready'],['paid','prepared'],['failed','prepared'],['refunded','prepared'],
])('opens the original status reference for terminal payment %s and attempt %s without another checkout',async(paymentStatus,attemptState)=>{
 rememberPaystackOrder(key,'ORD-CARD',attemptState);
 replies['/api/checkout/recovery']=async()=>response({ok:true,id:'ORD-CARD',total:3500,attemptState,paymentStatus,authorizationUrl:url});
 const page=await checkout();page.method('card');await page.submit();
 expect(assign).toHaveBeenCalledWith('/pay/success?ref=ORD-CARD');
 expect(requests.some(request=>request.path==='/api/paystack/checkout'||request.path==='/api/stripe/checkout')).toBe(false);
 expect(JSON.parse(data.get(PAYSTACK_ATTEMPT_KEY)!)).toEqual({key,orderId:'ORD-CARD',state:attemptState});
 expect(page.html()).toContain('/pay/success?ref=ORD-CARD');page.cleanup();
});
it('remembers a202 uncertain checkout and opens status without falling back to Stripe',async()=>{
 replies['/api/paystack/checkout']=async()=>response({ok:true,id:'ORD-UNKNOWN',orderId:'ORD-UNKNOWN',total:3500,attemptState:'unknown'},202);
 const page=await checkout();page.method('card');await page.submit();
 expect(JSON.parse(data.get(PAYSTACK_ATTEMPT_KEY)!)).toMatchObject({orderId:'ORD-UNKNOWN',state:'unknown'});
 expect(assign).toHaveBeenCalledWith('/pay/success?ref=ORD-UNKNOWN');expect(requests.some(request=>request.path==='/api/stripe/checkout')).toBe(false);page.cleanup();
});
it('strips the Paystack key from the unconfigured-provider Stripe fallback payload',async()=>{
 replies['/api/paystack/checkout']=async()=>response({error:'card_not_configured'},503);
 replies['/api/stripe/checkout']=async()=>response({ok:true,id:'ORD-STRIPE',url:'https://checkout.stripe.com/fixture'});
 const page=await checkout();page.method('card');await page.submit();
 expect(requests.find(request=>request.path==='/api/paystack/checkout')?.body?.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
 expect(requests.find(request=>request.path==='/api/stripe/checkout')?.body).toEqual({items,fulfillment:{method:'pickup'}});
 expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/fixture');page.cleanup();
});
it('does not fall back after a failed or uncertain configured provider response',async()=>{
 replies['/api/paystack/checkout']=async()=>response({error:'provider_unavailable'},503);
 const page=await checkout();page.method('card');await page.submit();
 expect(requests.some(request=>request.path==='/api/stripe/checkout')).toBe(false);expect(assign).not.toHaveBeenCalled();page.cleanup();
});
it('keeps ticket checkout on M-Pesa with its own key and no card option',async()=>{
 replies['/api/orders']=async()=>response({ok:true,id:'ORD-TICKET',attemptState:'unknown'},202);
 const page=await checkout('EVT-FIXTURE');expect(page.html()).not.toContain('value="card"');await page.submit();
 expect(requests.find(request=>request.path==='/api/orders')?.body).toMatchObject({ticket:{eventId:'EVT-FIXTURE',tier:0,qty:1},idempotencyKey:expect.stringMatching(/^[A-Za-z0-9_-]{32,128}$/)});
 expect(data.has(CHECKOUT_ATTEMPT_KEY)).toBe(true);expect(data.has(PAYSTACK_ATTEMPT_KEY)).toBe(false);expect(requests.some(request=>request.path==='/api/paystack/checkout')).toBe(false);page.cleanup();
});
