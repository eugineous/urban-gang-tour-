import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({values:[] as unknown[],refs:[] as {current:unknown}[],index:0,refIndex:0}));
vi.mock('react',async original=>({...await original<object>(),useCallback:(callback:unknown)=>callback,useEffect:()=>{},useState:(initial:unknown)=>{const index=hooks.index++;if(!(index in hooks.values))hooks.values[index]=initial;return [hooks.values[index],(next:unknown)=>{hooks.values[index]=typeof next==='function'?next(hooks.values[index]):next}]},useRef:(initial:unknown)=>{const index=hooks.refIndex++;return hooks.refs[index]||(hooks.refs[index]={current:initial})}}));
import Field from '@/app/admin/ops/EventCategoryField';
type Node={type?:unknown;props:{id?:string;children?:unknown;role?:string;value?:string;'aria-label'?:string;disabled?:boolean;onClick?:()=>unknown;onChange?:(event:{target:{value:string}})=>void}};
function find(value:unknown,predicate:(node:Node)=>boolean):Node|undefined{if(!value||typeof value!=='object'||!('props' in value))return;const node=value as Node;if(predicate(node))return node;for(const child of [node.props.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}}
const fetchMock=vi.fn(),onChange=vi.fn(),onBusy=vi.fn(),onDirty=vi.fn(),onLoaded=vi.fn();
const row={id:'category-fixture',name:'Campus events',active:true,version:1};
function render(value=''){hooks.index=0;hooks.refIndex=0;return Field({value,onChange,onBusy,onDirty,onLoaded,disabled:false})}
function content(node:Node){return node.props['aria-label']||[node.props.children].flat(Infinity).join('')}
function button(label:string){const node=find(render(),node=>node.type==='button'&&content(node)===label);expect(node,label).toBeTruthy();return node!}
function enter(name:string){button('New category').props.onClick!();find(render(),node=>node.props.id==='category-name')!.props.onChange!({target:{value:name}})}
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
beforeEach(()=>{hooks.values=[];hooks.refs=[];vi.clearAllMocks();fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock)});
afterEach(()=>vi.unstubAllGlobals());
it('creates and selects a category without pretending the event itself was saved',async()=>{
 fetchMock.mockResolvedValue(response({ok:true,row}));enter('Campus events');button('Save category').props.onClick!();await vi.waitFor(()=>expect(onChange).toHaveBeenCalledWith(row.id));expect(onBusy).toHaveBeenCalledWith(true);expect(onBusy).toHaveBeenLastCalledWith(false);expect(find(render(),node=>node.props.role==='status'&&String(node.props.children).includes('Save the event'))).toBeTruthy();expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({action:'create',name:'Campus events'});
});
it('keeps the typed name after a missing server acknowledgement or a conflict',async()=>{
 for(const reply of [response({}),response({error:'category_exists'},409)]){fetchMock.mockResolvedValueOnce(reply);if(!find(render(),node=>node.props.id==='category-name'))enter('Campus events');button('Save category').props.onClick!();await vi.waitFor(()=>expect(find(render(),node=>node.props.role==='alert')).toBeTruthy());expect(find(render(),node=>node.props.id==='category-name')?.props.value).toBe('Campus events');expect(onChange).not.toHaveBeenCalled()}
});
it('prevents double creates while an acknowledgement is pending',async()=>{
 let finish!:(value:Response)=>void;fetchMock.mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve}));enter('Campus events');const save=button('Save category');save.props.onClick!();save.props.onClick!();expect(fetchMock).toHaveBeenCalledTimes(1);finish(response({ok:true,row}));await vi.waitFor(()=>expect(onChange).toHaveBeenCalledOnce());
});
it('does not let a stale initial list overwrite a newly created category',async()=>{
 let finish!:(value:Response)=>void;fetchMock.mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve})).mockResolvedValueOnce(response({ok:true,row}));button('Refresh categories').props.onClick!();enter('Campus events');button('Save category').props.onClick!();await vi.waitFor(()=>expect(onChange).toHaveBeenCalledOnce());finish(response({ok:true,rows:[]}));await new Promise(resolve=>setTimeout(resolve,0));expect(find(render(),node=>node.type==='option'&&Array.isArray(node.props.children)&&node.props.children[0]==='Campus events')).toBeTruthy();
});
it('renames and pauses with version guards while keeping an assigned paused option',async()=>{
 fetchMock.mockResolvedValueOnce(response({ok:true,rows:[row]}));button('Refresh categories').props.onClick!();await vi.waitFor(()=>expect(onLoaded).toHaveBeenCalledWith(true));button('Rename Campus events').props.onClick!();find(render(),node=>node.props.id==='category-name')!.props.onChange!({target:{value:'Campus culture'}});fetchMock.mockResolvedValueOnce(response({ok:true,row:{...row,name:'Campus culture',version:2}}));button('Save category').props.onClick!();await vi.waitFor(()=>expect(find(render(),node=>content(node)==='Rename Campus culture')).toBeTruthy());fetchMock.mockResolvedValueOnce(response({ok:true,row:{...row,name:'Campus culture',version:3,active:false}}));button('Pause Campus culture').props.onClick!();await vi.waitFor(()=>expect(find(render(row.id),node=>node.type==='option'&&Array.isArray(node.props.children)&&node.props.children[1]===' (paused)')).toBeTruthy());expect(onChange).not.toHaveBeenCalled();expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body)).toMatchObject({action:'update',active:false,version:2});
});
