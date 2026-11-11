import {hasDb} from './db';
import {paystackConfigured} from './paystack';

// Optional server-only launch switch. Never infer merchant certification from it.
export function paystackTicketsEnabled():boolean {
 return process.env.PAYSTACK_TICKETS_ENABLED==='true'&&hasDb()&&paystackConfigured();
}
