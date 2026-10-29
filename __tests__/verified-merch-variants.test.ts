import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/db',()=>({hasDb:()=>true,q:vi.fn()}));
import {q} from '@/lib/server/db';
import {applyVerifiedMerchVariants} from '@/lib/server/merch-variants';
const line={id:'cb-hoodie',qty:1,name:'Color Blast Pullover Hoodie',unit:3500};
beforeEach(()=>vi.clearAllMocks());
it('requires a genuine configured choice even when a forged cart omits variant selection',async()=>{
 vi.mocked(q).mockResolvedValue([{product_id:'cb-hoodie'}]);
 await expect(applyVerifiedMerchVariants([{id:'cb-hoodie',qty:1}],[line])).rejects.toThrow('variant_required');
});
it('retains ordinary products with no configured variants',async()=>{
 vi.mocked(q).mockResolvedValue([]);
 expect(await applyVerifiedMerchVariants([{id:'cb-hoodie',qty:1}],[line])).toEqual({lines:[line],adjustment:0});
});
it('uses only the active server variant price adjustment and fails closed for an invented choice',async()=>{
 vi.mocked(q).mockResolvedValueOnce([{label:'Black / M',price_adjustment:200}]).mockResolvedValueOnce([]);
 expect(await applyVerifiedMerchVariants([{id:'cb-hoodie',qty:2,variant:'Black / M'}],[{...line,qty:2}])).toEqual({lines:[{...line,qty:2,name:'Color Blast Pullover Hoodie (Black / M)',unit:3700,variant:'Black / M'}],adjustment:400});
 await expect(applyVerifiedMerchVariants([{id:'cb-hoodie',qty:1,variant:'Invented size'}],[line])).rejects.toThrow('unknown_variant');
});
