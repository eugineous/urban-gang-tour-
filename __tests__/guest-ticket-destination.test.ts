import {expect,it} from 'vitest';
import {guestTicketDestination} from '@/lib/client/guest-ticket-destination';
const order='ORD-A1B2C3D4E5F60718293A4B5C6D7E8F90';
const code='TKT-ABCDEFGHJKLMNPQRSTUVWX-ABCDEFGHJKLM';
it.each([order,' '+order+' ','https://urbangangtour.co.ke/tickets/'+order,'https://www.urbangangtour.co.ke/pay/success?ref='+order])('opens a strong order reference through the existing entitlement page (%s)',value=>{
 expect(guestTicketDestination(value)).toBe('/tickets/'+order);
});
it.each([code,'https://urbangangtour.co.ke/t/'+code])('opens an individual ticket without creating an account (%s)',value=>{
 expect(guestTicketDestination(value)).toBe('/t/'+code);
});
it.each(['','buyer@example.com','0712345678','ORD-OLD123','https://evil.test/t/'+code,'https://urbangangtour.co.ke.evil.test/t/'+code,'https://u:p@urbangangtour.co.ke/t/'+code,'http://urbangangtour.co.ke/t/'+code,'https://urbangangtour.co.ke:8443/t/'+code,'https://urbangangtour.co.ke/admin','//evil.test/t/'+code,code+'/../admin'])('rejects personal identifiers, weak legacy references and unsafe destinations (%s)',value=>{
 expect(guestTicketDestination(value)).toBeNull();
});
