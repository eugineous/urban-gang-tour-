import {beforeEach,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>({values:[] as any[],index:0}));
vi.mock('react',async original=>({...await original<any>(),useState:(initial:any)=>{const index=hooks.index++;if(!(index in hooks.values))hooks.values[index]=initial;return [hooks.values[index],(value:any)=>{hooks.values[index]=typeof value==='function'?value(hooks.values[index]):value}];}}));
import Editor from '@/app/admin/ops/EventBriefImport';
const onUse=vi.fn(),onCancel=vi.fn();
function render(){hooks.index=0;return Editor({onUse,onCancel})}
function find(node:any,predicate:(n:any)=>boolean):any{if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result}}
function button(tree:any,label:string){return find(tree,node=>node.type==='button'&&node.props.children===label)}
beforeEach(()=>{hooks.values=[];hooks.index=0;vi.clearAllMocks()});
it('requires explicit preview and use, fills a chosen event, and never saves on paste',()=>{
 let tree=render();find(tree,n=>n.props?.id==='event-brief-paste').props.onChange({target:{value:'Name: First\nDate: 2026-11-06\nName: Second\nDate: 2026-11-07'}});expect(onUse).not.toHaveBeenCalled();
 tree=render();button(tree,'Preview import').props.onClick();tree=render();find(tree,n=>n.props?.id==='import-event-choice').props.onChange({target:{value:'1'}});tree=render();button(tree,'Use this draft').props.onClick();expect(onUse).toHaveBeenCalledWith(expect.objectContaining({name:'Second',eventDate:'2026-11-07'}));
});
it('clears an outdated preview after edits and keeps invalid imports from being used',()=>{
 let tree=render();find(tree,n=>n.props?.id==='event-brief-paste').props.onChange({target:{value:'Name: First'}});tree=render();button(tree,'Preview import').props.onClick();expect(button(render(),'Use this draft')).toBeTruthy();
 tree=render();find(tree,n=>n.props?.id==='event-brief-paste').props.onChange({target:{value:'{"name":'}});tree=render();expect(button(tree,'Use this draft')).toBeUndefined();button(tree,'Preview import').props.onClick();expect(button(render(),'Use this draft')).toBeUndefined();expect(onUse).not.toHaveBeenCalled();
});
it('cancel returns without importing',()=>{button(render(),'Cancel import').props.onClick();expect(onCancel).toHaveBeenCalledOnce();expect(onUse).not.toHaveBeenCalled()});
