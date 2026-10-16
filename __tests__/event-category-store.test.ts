import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({q:vi.fn(),schema:vi.fn(),ops:vi.fn(),bump:vi.fn()}));
vi.mock('@/lib/server/db',()=>({q:state.q,qSchema:state.schema}));
vi.mock('@/lib/server/ops',()=>({ensureOpsSchema:state.ops}));
vi.mock('@/lib/server/public-cache',()=>({bumpEventPublicTruth:state.bump}));
import {listEventCategories,saveEventCategory,EVENT_CATEGORY_SCHEMA} from '@/lib/server/event-categories';
const row={id:'category-fixture',name:'Campus events',active:true,version:1};
beforeEach(()=>{vi.clearAllMocks();state.q.mockResolvedValue([row]);state.schema.mockResolvedValue(undefined);state.ops.mockResolvedValue(undefined)});
it('adds nullable indexed references without rewriting event or financial data',async()=>{
 await listEventCategories();expect(state.schema).toHaveBeenCalledWith(EVENT_CATEGORY_SCHEMA);expect(EVENT_CATEGORY_SCHEMA).toContain('ON DELETE RESTRICT');expect(EVENT_CATEGORY_SCHEMA).toContain('ON tour_events(category_id)');expect(EVENT_CATEGORY_SCHEMA).not.toMatch(/UPDATE |DELETE FROM |DROP /i);expect(state.q).toHaveBeenCalledWith('SELECT id,name,active,version FROM event_categories ORDER BY active DESC,lower(name),id');
});
it('creates with parameters and audits the successful row atomically',async()=>{
 const name="Campus's events";await saveEventCategory({action:'create',name},'fixture-editor');const [sql,args]=state.q.mock.calls[0];expect(sql).toContain('ON CONFLICT DO NOTHING');expect(sql).toContain('INSERT INTO audit_log');expect(sql).not.toContain(name);expect(args[1]).toBe(name);expect(args[0]).toMatch(/^category-[a-f0-9]{32}$/);expect(state.bump).toHaveBeenCalledOnce();
});
it('uses versioned narrow edits and never touches assigned event payloads',async()=>{
 state.q.mockResolvedValue([{...row,active:false,version:2}]);expect(await saveEventCategory({action:'update',...row,active:false},'fixture-editor')).toMatchObject({active:false,version:2});const [sql,args]=state.q.mock.calls[0];expect(sql).toContain('WHERE id=$1 AND version=$4');expect(sql).not.toContain('UPDATE tour_events');expect(args).toEqual([row.id,row.name,false,1,'fixture-editor']);
});
it('does not claim success or invalidate truth when a stale edit loses its guard',async()=>{
 state.q.mockResolvedValue([]);await expect(saveEventCategory({action:'update',...row},'fixture-editor')).rejects.toThrow('category_conflict');expect(state.bump).not.toHaveBeenCalled();await expect(saveEventCategory({action:'create',name:row.name},'fixture-editor')).rejects.toThrow('category_exists');
});
