import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({available:true,q:vi.fn()}));
vi.mock('@/lib/server/db',()=>({hasDb:()=>state.available,q:state.q}));
vi.mock('@/lib/server/promos',()=>({getActivePromos:async()=>[],validatePromoCode:async()=>null,bestAutoDiscountForProduct:()=>null,discountFromCodeRow:()=>null,applyDiscount:(price:number)=>price}));
import { getProducts, serverTotalWithPromos, getTicketTiers, invalidateCatalogCaches } from '@/lib/server/catalog';
beforeEach(()=>{state.available=true;state.q.mockReset();invalidateCatalogCaches()});
describe('fresh backend sale truth',()=>{
 it('rechecks prices for checkout instead of trusting a display cache',async()=>{let price=100;state.q.mockImplementation(async()=>[{id:'tee',name:'Fixture tee',price}]);expect((await getProducts()).tee.price).toBe(100);price=120;expect((await serverTotalWithPromos([{id:'tee',qty:1}])).total).toBe(120)});
 it('does not resurrect removed products from an earlier nonempty cache',async()=>{state.q.mockResolvedValueOnce([{id:'tee',name:'Fixture',price:100}]).mockResolvedValueOnce([]);await getProducts();await expect(serverTotalWithPromos([{id:'tee',qty:1}])).rejects.toThrow('unknown product')});
 it('refuses new sales during a database outage even with an earlier valid price',async()=>{state.q.mockResolvedValueOnce([{id:'tee',name:'Fixture',price:100}]);await getProducts();state.q.mockRejectedValue(new Error('fixture outage'));await expect(serverTotalWithPromos([{id:'tee',qty:1}])).rejects.toThrow('unknown product')});
 it('refreshes ticket sale eligibility rather than restoring cancelled events',async()=>{state.q.mockResolvedValueOnce([{id:'show',name:'Fixture',tiers:[{name:'Regular',price:100}]}]).mockResolvedValueOnce([]);expect(await getTicketTiers()).toHaveProperty('show');expect(await getTicketTiers()).toEqual({})});
});
