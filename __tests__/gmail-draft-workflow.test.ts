import {beforeEach,afterEach,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({values:[] as any[],index:0,effects:[] as (()=>void)[]}));
vi.mock('react',async original=>({...await original<any>(),
 useState:(initial:any)=>{const i=hooks.index++;if(!(i in hooks.values))hooks.values[i]=initial;return [hooks.values[i],(v:any)=>hooks.values[i]=typeof v==='function'?v(hooks.values[i]):v]},
 useRef:(initial:any)=>{const i=hooks.index++;if(!(i in hooks.values))hooks.values[i]={current:initial};return hooks.values[i]},
 useMemo:(fn:()=>any)=>fn(),useEffect:(fn:()=>void)=>hooks.effects.push(fn),
}));
import Inbox from '@/app/admin/GmailInbox';
const say=vi.fn(),messages=[{id:'a',from:'First <one@example.com>',subject:'First subject',body:'First email'},{id:'b',from:'Second <two@example.com>',subject:'Second subject',body:'Second email'}];
function render(){hooks.index=0;hooks.effects=[];return Inbox({googleClientId:'',say})}
function find(node:any,predicate:(n:any)=>boolean):any{if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const r=find(child,predicate);if(r)return r}}
function text(node:any):string{if(typeof node==='string')return node;if(!node||typeof node!=='object')return '';return [node.props?.children].flat(Infinity).map(text).join(' ')}
const field=(tree:any)=>find(tree,n=>n.type==='textarea'&&n.props['aria-label']==='Email reply');
const messageButton=(tree:any,subject:string)=>find(tree,n=>n.type==='button'&&text(n).includes(subject));
async function flush(){for(let i=0;i<70;i++)await Promise.resolve()}
beforeEach(()=>{vi.useFakeTimers();hooks.values=[];hooks.index=0;hooks.effects=[];vi.clearAllMocks();vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('fetch',vi.fn(async(path:string)=>new Response(JSON.stringify(path.includes('/reply-drafts')?{ok:true,draft:null}:path.endsWith('/gmail')?{connected:true,email:'owner@example.com'}:{messages}))));});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals()});
async function loaded(){render();hooks.effects.forEach(effect=>effect());await flush();render();hooks.effects.forEach(effect=>effect());await flush();return render()}
it('keeps separate reply drafts when switching messages',async()=>{
 let tree=await loaded();field(tree).props.onChange({target:{value:'First reply'}});tree=render();messageButton(tree,'Second subject').props.onClick();tree=render();expect(field(tree).props.value).toBe('');field(tree).props.onChange({target:{value:'Second reply'}});tree=render();messageButton(tree,'First subject').props.onClick();tree=render();expect(field(tree).props.value).toBe('First reply');
});
it('preserves typed replies and unlocks sending after a network failure without claiming delivery',async()=>{
 let tree=await loaded();field(tree).props.onChange({target:{value:'Keep my reply'}});tree=render();vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline')}));await find(tree,n=>n.type==='button'&&text(n)==='Send reply').props.onClick();tree=render();expect(field(tree).props.value).toBe('Keep my reply');expect(find(tree,n=>n.type==='button'&&text(n)==='Send reply').props.disabled).toBe(false);expect(say).not.toHaveBeenCalledWith('Email reply sent');expect(say).toHaveBeenCalledWith(expect.stringContaining('Save your reply draft'));
});
it('unlocks loading and offers recovery when the initial request fails',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline')}));const tree=await loaded();expect(text(tree)).toContain('Could not load Gmail');expect(find(tree,n=>n.type==='button'&&text(n)==='Retry')).toBeTruthy();
});
it('uses the saved send reference and retains the draft after provider uncertainty',async()=>{
 let tree=await loaded();field(tree).props.onChange({target:{value:'An uncertain reply'}});tree=render();const sends:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,init:RequestInit)=>{
  const value=JSON.parse(String(init.body));if(path.endsWith('/reply-drafts'))return new Response(JSON.stringify({ok:true,draft:{subject:'',body:value.body,version:'11111111-1111-4111-8111-111111111111',sendKey:'a'.repeat(32),deleted:false}}));
  sends.push(value);return new Response(JSON.stringify({ok:false,error:'gmail_send_outcome_unknown'}),{status:202});
 }));
 await find(tree,n=>n.type==='button'&&text(n)==='Send reply').props.onClick();tree=render();expect(sends).toHaveLength(1);expect(sends[0].requestId).toBe('a'.repeat(32));expect(field(tree).props.value).toBe('An uncertain reply');expect(say).toHaveBeenCalledWith(expect.stringContaining('Check Gmail Sent'));
 await find(tree,n=>n.type==='button'&&text(n)==='Send reply').props.onClick();expect(sends[1].requestId).toBe(sends[0].requestId);
});
