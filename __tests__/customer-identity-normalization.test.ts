import {expect,it} from 'vitest';
import {normalizeCustomerEmail,normalizeCustomerPhone} from '@/lib/shared/customer-identity';
it.each([['0712345678','+254712345678'],['254712345678','+254712345678'],['+254 712 345 678','+254712345678'],['(0112) 345-678','+254112345678']])('normalizes %s to one Kenyan identity', (value,want)=>expect(normalizeCustomerPhone(value)).toBe(want));
it.each(['123','+15555555555','2540712345678','07<script>','07123456789',''])('rejects invalid phone %s',value=>expect(normalizeCustomerPhone(value)).toBeNull());
it('normalizes case and surrounding whitespace, not provider-specific aliases',()=>{
 expect(normalizeCustomerEmail(' Buyer+Tickets@Example.COM ')).toBe('buyer+tickets@example.com');
 expect(normalizeCustomerEmail('a.b@gmail.com')).toBe('a.b@gmail.com');
 expect(normalizeCustomerEmail('a@@b.com')).toBeNull();expect(normalizeCustomerEmail('a b@example.com')).toBeNull();
});
