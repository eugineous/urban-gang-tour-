import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {campaignSelectionAfterFeed} from '@/lib/client/campaign-selection';
import {openCampaignDialog} from '@/lib/client/campaign-dialog';
const popup={id:'popup',format:'popup' as const,headline:'Previous offer'},banner={id:'banner',format:'banner' as const,headline:'Previous announcement'};
afterEach(()=>vi.unstubAllGlobals());
it('withdraws both selected creatives when a valid feed becomes empty',()=>{
 expect(campaignSelectionAfterFeed({popup,banner},[])).toEqual({popup:undefined,banner:undefined});
});
it('withdraws a removed campaign and refreshes the retained creative from the current feed',()=>{
 const changed={...banner,headline:'Updated announcement'};
 expect(campaignSelectionAfterFeed({popup,banner},[changed])).toEqual({popup:undefined,banner:changed});
});
it('does not retain a campaign in a presentation that was changed by staff',()=>{
 expect(campaignSelectionAfterFeed({popup},[{...popup,format:'banner'}])).toEqual({popup:undefined,banner:undefined});
});
it('active-to-empty selection permits one balanced native modal cleanup',()=>{
 const dispatchEvent=vi.fn(),style={overflow:'auto'};
 vi.stubGlobal('window',{dispatchEvent});vi.stubGlobal('document',{body:{style}});
 const dialog={open:false,showModal(){this.open=true},close:vi.fn(function(this:{open:boolean}){this.open=false})};
 const cleanup=openCampaignDialog(dialog as unknown as HTMLDialogElement);
 expect(dialog.open).toBe(true);
 const next=campaignSelectionAfterFeed({popup,banner},[]);
 if(!next.popup)cleanup?.();
 expect(dialog.open).toBe(false);expect(style.overflow).toBe('auto');
 expect(dispatchEvent.mock.calls.map(([event])=>[event.type,event.detail])).toEqual([['ugt-overlay-change',true],['ugt-overlay-change',false]]);
 expect(dialog.close).toHaveBeenCalledTimes(1);
});
it('wires snapshot withdrawal and expired visibility resume to immediate selection clearing',()=>{
 const source=readFileSync('app/_components/CampaignDisplays.tsx','utf8');
 expect(source).toContain('setSelection(current=>campaignSelectionAfterFeed(current,activeRows.filter(');
 expect(source).toContain('data.validForMs>elapsed?rows:[]');
 expect(source).toContain('if(performance.now()>=lease.current){setCampaigns([]);setSelection({});}');
 expect(source).toContain('if (lease.current && clock>=lease.current) { lease.current=0; setCampaigns([]); setSelection({}); return; }');
});
