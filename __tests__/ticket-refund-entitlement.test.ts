import {it,expect} from 'vitest';
import {ticketIsActive} from '@/lib/server/ticket-entitlement';
it('only preserves individually allocated unvoided partial-refund tickets',()=>{
 expect(ticketIsActive({order_status:'paid'})).toBe(true);expect(ticketIsActive({order_status:'fulfilled'})).toBe(true);expect(ticketIsActive({order_status:'partially_refunded',ticket_refund_policy:'allocated'})).toBe(true);
 for(const ticket of [{order_status:'refunded',ticket_refund_policy:'allocated'},{order_status:'pending',ticket_refund_policy:'allocated'},{order_status:'partially_refunded'},{order_status:'paid',voided_at:'2026-01-01'},{order_status:'partially_refunded',ticket_refund_policy:'allocated',voided_at:'2026-01-01'}])expect(ticketIsActive(ticket)).toBe(false);
});
