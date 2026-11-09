import {expect,it} from 'vitest';
import {reconcileInstagramProjection,scheduledInstagramWorkNeeded} from '../scripts/instagram-github-store.mjs';
const stored={version:1,account:'urban_newsgang',posts:[],automation:{enabled:true,publishGeneral:false},lastChecked:'2026-11-09T00:00:00.000Z'};
it('repairs a missing public index from a durable checkpoint on scheduled retry',async()=>{
 let current=null;let broken=true;const save=async value=>{if(broken)throw Error('upload_failed');current=value};
 await expect(reconcileInstagramProjection(stored,null,save)).rejects.toThrow('upload_failed');
 expect(scheduledInstagramWorkNeeded(stored,current)).toBe(true);broken=false;
 await reconcileInstagramProjection(stored,current,save);expect(current.automation.enabled).toBe(true);
 await reconcileInstagramProjection(stored,current,async()=>{throw Error('unchanged_should_not_write')});
});
it('repairs previously approved publication even if automatic imports are disabled',async()=>{
 const disabled={...stored,automation:{enabled:false,publishGeneral:false}};let current=null;
 expect(scheduledInstagramWorkNeeded(disabled,current)).toBe(true);
 await reconcileInstagramProjection(disabled,current,async value=>{current=value});
 expect(scheduledInstagramWorkNeeded(disabled,current)).toBe(false);
 expect(scheduledInstagramWorkNeeded(null,null)).toBe(false);
});
