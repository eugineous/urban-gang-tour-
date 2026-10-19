import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const hooks=vi.hoisted(()=>({values:[] as unknown[],index:0}));
vi.mock('react',async original=>({...await original<object>(),useEffect:()=>{},useState:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.values))hooks.values[i]=initial;return [hooks.values[i],(value:unknown)=>hooks.values[i]=typeof value==='function'?(value as (v:unknown)=>unknown)(hooks.values[i]):value]},useRef:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.values))hooks.values[i]={current:initial};return hooks.values[i]}}));
import RefundRecorder from '@/app/admin/RefundRecorder';
const saved=vi.fn(),close=vi.fn(),fetcher=vi.fn();
function render(){hooks.index=0;return RefundRecorder({order:{id:'ORD-TEST',total:1000,status:'paid'},onSaved:saved,onClose:close})}
type Node={type?:unknown;props?:Record<string,any>};
function find(node:unknown,test:(node:Node)=>boolean):Node|undefined{if(!node||typeof node!=='object')return;const value=node as Node;if(test(value))return value;for(const child of [value.props?.children].flat(Infinity)){const match=find(child,test);if(match)return match}}
function label(tree:unknown,part:string){const row=find(tree,node=>node.type==='label'&&String([node.props?.children].flat()[0]).includes(part));return find(row,node=>node.type==='input'||node.type==='textarea')!}
function fill(){let tree=render();for(const [field,value]of [['Amount returned','500'],['Provider or bank','BANK-123'],['Reason','Actual external return']]){label(tree,field).props!.onChange({target:{value}});tree=render()}find(tree,node=>node.type==='input'&&node.props?.type==='checkbox')!.props!.onChange({target:{checked:true}});return render()}
beforeEach(()=>{hooks.values=[];hooks.index=0;saved.mockClear();close.mockClear();fetcher.mockReset();vi.stubGlobal('fetch',fetcher)});
afterEach(()=>vi.unstubAllGlobals());
it('sends typed evidence only after explicit submission, never during rendering',async()=>{
 const tree=fill();expect(fetcher).not.toHaveBeenCalled();fetcher.mockResolvedValue(new Response(JSON.stringify({ok:true,status:'partially_refunded',moneyMovement:'external_record_attested'})));
 await find(tree,node=>node.type==='form')!.props!.onSubmit({preventDefault(){}});expect(saved).toHaveBeenCalledTimes(1);
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.data).toMatchObject({refundAmount:500,externalReference:'BANK-123',externalConfirmed:true,ticketCodes:[]});expect(payload.data.requestId).toMatch(/^[a-f0-9-]{36}$/);
});
it('keeps the exact snapshot and key after a lost acknowledgement',async()=>{
 let tree=fill();fetcher.mockRejectedValue(Error('offline'));await find(tree,node=>node.type==='form')!.props!.onSubmit({preventDefault(){}});const first=fetcher.mock.calls[0][1].body;tree=render();expect(find(tree,node=>node.type==='fieldset')?.props?.disabled).toBe(true);expect(saved).not.toHaveBeenCalled();await find(tree,node=>node.type==='form')!.props!.onSubmit({preventDefault(){}});expect(fetcher.mock.calls[1][1].body).toBe(first);
});
