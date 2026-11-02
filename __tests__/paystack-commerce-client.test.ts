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
 Children.forEach(node,child=>{if(isValidElement<Props>(child)){
  found.push(child,...nodes(child.props.children));
  const values=child.props.values;
  if(values&&typeof values==='object')for(const value of Object.values(values))if(isValidElement(value))found.push(...nodes(value));
 }});
 return found;
}
function render(state:State,component:()=>ReactNode){hooks.active=state;hooks.index=0;hooks.refIndex=0;state.effects=[];try{return component()}finally{hooks.active=null}}
const state=():State=>({values:[],refs:[],effects:[]});
const product={id:'cb-fixture',name:'Fixture merchandise',price:3500,made_to_order:true,stock:null,variants:[{label:'Black / M',priceAdjustment:0,stock:null}]};
const items=[{id:'cb-fixture',qty:1,variant:'Black / M'}];
const key='a'.repeat(32),url='https://checkout.paystack.com/recover_fixture';
let data:Map<string,string>,sessionData:Map<string,string>,events:EventTarget;
let writes:Array<{name:string;value:string}>;
let requests:Array<{path:string;body:Record<string,unknown>|null}>;
let replies:Record<string,()=>Promise<Response>>;
const assign=vi.fn();
const response=(body:object,status=200)=>new Response(JSON.stringify(body),{status});
beforeEach(()=>{
 data=new Map([['ugt-live-cart-v1',JSON.stringify(items)]]);sessionData=new Map();requests=[];writes=[];events=new EventTarget();assign.mockReset();
 const storage=(values:Map<string,string>)=>({getItem:(name:string)=>values.get(name)||null,setItem:(name:string,value:string)=>{if(values===data)writes.push({name,value});values.set(name,value)},removeItem:(name:string)=>values.delete(name)});
 vi.stubGlobal('localStorage',storage(data));vi.stubGlobal('sessionStorage',storage(sessionData));
 vi.stubGlobal('window',{location:{assign},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)});
 vi.stubGlobal('location',{search:''});
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0});
 replies={
  '/api/site-data/products':async()=>response({ok:true,products:[product]}),
  '/api/site-data/events':async()=>response({ok:true,events:[{id:'EVT-FIXTURE',name:'Fixture event',sellable:true,tiers:[{name:'Standard',price:900,sellable:true}]}]}),
  '/api/checkout/fulfillment':async()=>response({pickup:{enabled:true,fee:0,location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments:{mpesa:true,card:true}}),
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

async function checkout(eventId?:string,view:'shop'|'cart'|'checkout'='checkout'){
 const shell=state(),client=state();
 let shellTree=render(shell,()=>LiveCommerce({view,eventId}));
 for(const effect of shell.effects)effect();
 shellTree=render(shell,()=>LiveCommerce({view,eventId}));
 const child=nodes(shellTree).find(node=>typeof node.type==='function'&&node.type.name==='CommerceClient')!;
 const component=()=> (child.type as (props:Props)=>ReactNode)(child.props);
 let tree=render(client,component);
 const cleanup=client.effects.map(effect=>effect());
 await vi.waitFor(()=>{tree=render(client,component);expect(renderToStaticMarkup(tree)).not.toContain('Loading the live catalogue')});
 function rerender(){tree=render(client,component);return tree}
 function method(value:string){
  const tile=nodes(tree).find(node=>node.type==='input'&&node.props.name==='paymentMethod'&&node.props.value===value)!;
  tile.props.onChange!({target:{value}});rerender();
 }
 async function submit(){await nodes(tree).find(node=>node.type==='form')!.props.onSubmit!({preventDefault:()=>{}});rerender()}
 return {method,submit,rerender,html:()=>renderToStaticMarkup(tree),tree:()=>tree,cleanup:()=>cleanup.forEach(stop=>{if(typeof stop==='function')stop()})};
}

it.each([{mpesa:false,card:false},{mpesa:true,card:false},{mpesa:false,card:true},{mpesa:true,card:true}])('offers only Paystack card regardless of legacy wallet configuration: %j',async payments=>{
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{enabled:true,fee:0,location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments});
 const page=await checkout();const html=page.html();expect(html.includes('value="mpesa"')).toBe(false);expect(html.includes('value="card"')).toBe(payments.card);
 if(!payments.card){expect(html).toContain('Online payment is currently unavailable');expect(html).toContain('href="/contact-us"');await page.submit();expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout','/api/checkout/session'].includes(request.path))).toBe(false)}
 page.cleanup();
});
it.each([
 {provider:'paystack',storage:'ugt-paystack-attempt-v1',payments:{mpesa:true,card:false},orderId:'ORD-OLD-CARD'},
 {provider:'paystack',storage:'ugt-paystack-attempt-v1',payments:{mpesa:true,card:false},orderId:undefined},
 {provider:'mpesa',storage:'ugt-mpesa-attempt-v1',payments:{mpesa:false,card:true},orderId:'ORD-OLD-MPESA'},
 {provider:'mpesa',storage:'ugt-mpesa-attempt-v1',payments:{mpesa:false,card:true},orderId:undefined},
])('blocks another provider while $provider has a saved uncertain attempt ($orderId)',async({provider,storage,payments,orderId})=>{
 data.set(storage,JSON.stringify({key,...(orderId?{orderId}:{}),state:'unknown'}));
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{enabled:true,fee:0,location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments});
 const page=await checkout();await page.submit();
 expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout'].includes(request.path))).toBe(false);
 expect(page.html()).toContain('data-saved-payment="'+provider+'"');
 page.cleanup();
});
it.each([null,{mpesa:true},{mpesa:'true',card:true}])('fails closed for missing or malformed payment options %j',async payments=>{
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments});
 const page=await checkout();await page.submit();expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout'].includes(request.path))).toBe(false);page.cleanup();
});
it.each([
 {provider:'paystack',storage:'ugt-paystack-attempt-v1',payments:{mpesa:true,card:false}},
 {provider:'mpesa',storage:'ugt-mpesa-attempt-v1',payments:{mpesa:false,card:true}},
])('recovers a key-only saved $provider attempt without initiating either provider',async({provider,storage,payments})=>{
 data.set(storage,JSON.stringify({key,state:'unknown'}));
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{enabled:true,fee:0,location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments});
 replies['/api/checkout/recovery']=async()=>response({ok:true,id:'ORD-FOUND123',total:3500,attemptState:'unknown',paymentStatus:'pending'});
 const page=await checkout();const control=nodes(page.tree()).find(node=>node.type==='button'&&node.props['data-saved-payment']===provider);
 expect(control).toBeDefined();await (control!.props.onClick as ()=>Promise<void>)();
 expect(assign).toHaveBeenCalledWith('/pay/success?ref=ORD-FOUND123');
 expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout'].includes(request.path))).toBe(false);
 expect(JSON.parse(data.get(storage)!).orderId).toBe('ORD-FOUND123');page.cleanup();
});
it('prevents payment while configuration is still loading',async()=>{
 let release:(response:Response)=>void=()=>{};
 replies['/api/checkout/fulfillment']=()=>new Promise(resolve=>{release=resolve});
 const page=await checkout();expect(page.html()).toContain('Loading payment options');await page.submit();
 expect(nodes(page.tree()).find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled).toBe(true);
 expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout','/api/checkout/session'].includes(request.path))).toBe(false);
 release(response({pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments:{mpesa:false,card:false}}));page.cleanup();
});
it('prevents payment when the configuration read fails',async()=>{
 replies['/api/checkout/fulfillment']=async()=>response({error:'unavailable'},503);
 const page=await checkout();await page.submit();expect(page.html()).toContain('We could not load pickup and delivery options');
 expect(nodes(page.tree()).find(node=>node.type==='button'&&node.props.type==='submit')?.props.disabled).toBe(true);
 expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout','/api/checkout/session'].includes(request.path))).toBe(false);page.cleanup();
});
it('uses the only configured card method rather than the old M-Pesa default',async()=>{
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments:{mpesa:false,card:true}});
 const page=await checkout();await page.submit();expect(assign).toHaveBeenCalledWith(url);expect(requests.some(request=>request.path==='/api/orders')).toBe(false);page.cleanup();
});
it('keeps saved payment references visible when their providers are disabled',async()=>{
 data.set(PAYSTACK_ATTEMPT_KEY,JSON.stringify({key,orderId:'ORD-OLD-CARD',state:'unknown'}));data.set(CHECKOUT_ATTEMPT_KEY,JSON.stringify({key:'b'.repeat(32),orderId:'ORD-OLD-MPESA',state:'unknown'}));
 replies['/api/checkout/fulfillment']=async()=>response({pickup:{location:'Fixture pickup'},delivery:{enabled:false,fee:null},payments:{mpesa:false,card:false}});
 const page=await checkout();expect(page.html()).toContain('/pay/success?ref=ORD-OLD-CARD');expect(page.html()).toContain('/pay/success?ref=ORD-OLD-MPESA');await page.submit();expect(assign).not.toHaveBeenCalled();expect(requests.some(request=>request.path==='/api/checkout/session')).toBe(false);page.cleanup();
});
it.each([undefined,'Old Blue / L'])('requires explicit repair of a saved missing or obsolete variant %s',async variant=>{
 data.set('ugt-live-cart-v1',JSON.stringify([{id:'cb-fixture',qty:2,variant,printableName:'Amina'}]));
 replies['/api/site-data/products']=async()=>response({ok:true,products:[{...product,name_on_back_enabled:true}]});
 const page=await checkout();expect(page.html()).not.toContain('value="card"');expect(page.html()).toContain('Choose an available option');
 const select=nodes(page.tree()).find(node=>node.type==='select'&&node.props['aria-label']==='Variation for Fixture merchandise');expect(select).toBeDefined();
 select!.props.onChange!({target:{value:'Black / M'}});page.rerender();
 expect(JSON.parse(data.get('ugt-live-cart-v1')!)).toEqual([{id:'cb-fixture',qty:2,variant:'Black / M',printableName:'Amina'}]);expect(page.html()).toContain('value="card"');expect(requests.some(request=>request.path==='/api/orders')).toBe(false);page.cleanup();
});
it.each(['ugt-cart-changed','storage'])('updates from external %s cart changes without writing or echoing',async type=>{
 const page=await checkout();expect(writes).toEqual([]);
 data.set('ugt-live-cart-v1',JSON.stringify([{id:'cb-fixture',qty:3,variant:'Black / M',printableName:'Amina'}]));
 const event=new Event(type);if(type==='storage')Object.defineProperty(event,'key',{value:'ugt-live-cart-v1'});window.dispatchEvent(event);page.rerender();
 expect(page.html()).toContain('value="3"');expect(page.html()).toContain('Amina');expect(writes).toEqual([]);page.cleanup();
});
it('reads header search queries into the live collection filter',async()=>{
 vi.stubGlobal('location',{search:'?q=not-a-product'});const page=await checkout(undefined,'shop');expect(page.html()).not.toContain('data-shop-product="cb-fixture"');expect(page.html()).toContain('value="not-a-product"');page.cleanup();
});

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
it('keeps the cart and reports unavailable when Paystack is disabled without a Stripe fallback',async()=>{
 replies['/api/paystack/checkout']=async()=>response({error:'card_not_configured'},503);
 replies['/api/stripe/checkout']=async()=>response({ok:true,id:'ORD-STRIPE',url:'https://checkout.stripe.com/fixture'});
 const page=await checkout();page.method('card');await page.submit();
 expect(requests.find(request=>request.path==='/api/paystack/checkout')?.body?.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
 expect(requests.some(request=>request.path==='/api/stripe/checkout'||request.path==='/api/orders')).toBe(false);
 expect(assign).not.toHaveBeenCalled();expect(JSON.parse(data.get('ugt-live-cart-v1')!)).toEqual(items);expect(page.html()).toContain('Card checkout is unavailable');page.cleanup();
});
it('does not fall back after a failed or uncertain configured provider response',async()=>{
 replies['/api/paystack/checkout']=async()=>response({error:'provider_unavailable'},503);
 const page=await checkout();page.method('card');await page.submit();
 expect(requests.some(request=>request.path==='/api/stripe/checkout')).toBe(false);expect(assign).not.toHaveBeenCalled();page.cleanup();
});
it('discloses unavailable ticket payments without offering or initiating unsupported rails',async()=>{
 replies['/api/orders']=async()=>response({ok:true,id:'ORD-TICKET',attemptState:'unknown'},202);
 const page=await checkout('EVT-FIXTURE');expect(page.html()).not.toContain('value="card"');expect(page.html()).not.toContain('value="mpesa"');expect(page.html()).toContain('Ticket payments are currently unavailable');await page.submit();
 expect(data.has(CHECKOUT_ATTEMPT_KEY)).toBe(false);expect(data.has(PAYSTACK_ATTEMPT_KEY)).toBe(false);expect(requests.some(request=>['/api/orders','/api/paystack/checkout','/api/stripe/checkout','/api/checkout/session'].includes(request.path))).toBe(false);page.cleanup();
});
