// Existing rendered checkout and durable browser attempt, with only browser I/O
// and React hook scheduling substituted. No provider or live request.
import {Children,isValidElement,type ReactNode,type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
type State={values:unknown[];refs:{current:unknown}[];effects:(()=>void|(()=>void))[]};
const hooks=vi.hoisted(()=>({active:null as State|null,index:0,refIndex:0}));
vi.mock('react',async original=>{
 const real=await original<typeof import('react')>();return {...real,
  useState:(initial:unknown)=>{if(!hooks.active)return real.useState(initial);const s=hooks.active,i=hooks.index++;if(!(i in s.values))s.values[i]=typeof initial==='function'?initial():initial;return[s.values[i],(v:unknown)=>{s.values[i]=typeof v==='function'?v(s.values[i]):v}]},
  useRef:(initial:unknown)=>{if(!hooks.active)return real.useRef(initial);return hooks.active.refs[hooks.refIndex++]??(hooks.active.refs[hooks.refIndex-1]={current:initial})},
  useEffect:(effect:()=>void|(()=>void))=>{if(!hooks.active)return real.useEffect(effect);hooks.active.effects.push(effect)},
  useContext:(context:Parameters<typeof real.useContext>[0])=>hooks.active?{locale:'en'}:real.useContext(context),
 };
});
import {LiveCommerce} from '@/app/_components/LiveCommerce';
type Props={children?:ReactNode;onSubmit?:(event:{preventDefault:()=>void})=>Promise<void>;[key:string]:any};
const nodes=(tree:ReactNode):ReactElement<Props>[]=>{const list:ReactElement<Props>[]=[];Children.forEach(tree,c=>{if(isValidElement<Props>(c))list.push(c,...nodes(c.props.children))});return list};
const state=():State=>({values:[],refs:[],effects:[]});
function render(s:State,component:()=>ReactNode){hooks.active=s;hooks.index=0;hooks.refIndex=0;s.effects=[];try{return component()}finally{hooks.active=null}}
let online=true,requests:{path:string;body:any}[],data:Map<string,string>,session:Map<string,string>;
const assign=vi.fn(),response=(value:unknown)=>new Response(JSON.stringify(value),{status:200});
beforeEach(()=>{
 online=true;requests=[];assign.mockReset();data=new Map([['ugt-live-cart-v1',JSON.stringify([{id:'tee',qty:2}])]]);session=new Map();
 const storage=(s:Map<string,string>)=>({getItem:(k:string)=>s.get(k)||null,setItem:(k:string,v:string)=>{s.set(k,v)},removeItem:(k:string)=>{s.delete(k)}}),events=new EventTarget();
 vi.stubGlobal('localStorage',storage(data));vi.stubGlobal('sessionStorage',storage(session));vi.stubGlobal('location',{search:'?event=event'});
 vi.stubGlobal('window',{location:{assign},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('fetch',async(path:string,init?:RequestInit)=>{
  const body=init?.body?JSON.parse(String(init.body)):null;requests.push({path,body});
  if(path==='/api/site-data/events')return response({ok:true,events:[{id:'event',name:'Fixture event',sellable:true,onlineCheckoutAvailable:online,tiers:[{name:'General',price:500,sellable:true,remaining:2,per_order_min:1,per_order_max:2}]}]});
  if(path==='/api/checkout/fulfillment')return response({pickup:{location:'Fixture'},delivery:{enabled:false,fee:null},payments:{mpesa:false,card:true}});
  if(path==='/api/checkout/session')return response({ok:true,created:false});
  if(path==='/api/paystack/checkout')return response({ok:true,id:'ORD-TICKET123',total:500,attemptState:'ready',authorizationUrl:'https://checkout.paystack.com/fixture-ticket'});
  throw Error('network forbidden: '+path);
 });
});
afterEach(()=>vi.unstubAllGlobals());
async function page(){
 const shell=state(),client=state();let tree=render(shell,()=>LiveCommerce({view:'checkout',eventId:'event'}));shell.effects.forEach(e=>e());tree=render(shell,()=>LiveCommerce({view:'checkout',eventId:'event'}));
 const child=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='CommerceClient')!,component=()=> (child.type as (props:Props)=>ReactNode)(child.props);
 tree=render(client,component);const cleanup=client.effects.map(e=>e());await vi.waitFor(()=>{tree=render(client,component);expect(renderToStaticMarkup(tree)).not.toContain('Loading the live catalogue')});
 return {html:()=>renderToStaticMarkup(tree),submit:async()=>{await nodes(tree).find(n=>n.type==='form')!.props.onSubmit!({preventDefault:()=>{}});tree=render(client,component)},cleanup:()=>cleanup.forEach(fn=>{if(typeof fn==='function')fn()})};
}
it('an eligible owned event dispatches exactly its ticket selection, never the merchandise cart or delivery',async()=>{
 const checkout=await page();await checkout.submit();const sent=requests.filter(r=>r.path==='/api/paystack/checkout');expect(sent).toHaveLength(1);
 expect(sent[0].body).toMatchObject({ticket:{eventId:'event',tier:0,qty:1}});expect(sent[0].body.items).toBeUndefined();expect(sent[0].body.fulfillment).toBeUndefined();expect(sent[0].body.promoCode).toBeUndefined();expect(sent[0].body.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
 expect(assign).toHaveBeenCalledWith('https://checkout.paystack.com/fixture-ticket');expect(data.get('ugt-live-cart-v1')).toContain('tee');expect(JSON.parse(session.get('ugt-checkout-order')!)).toMatchObject({id:'ORD-TICKET123',eventId:'event'});checkout.cleanup();
});
it('known inventory without the separate online gate cannot create a ticket payment',async()=>{
 online=false;const checkout=await page();await checkout.submit();expect(requests.some(r=>r.path==='/api/paystack/checkout')).toBe(false);expect(checkout.html()).toContain('Ticket payments are currently unavailable');checkout.cleanup();
});
