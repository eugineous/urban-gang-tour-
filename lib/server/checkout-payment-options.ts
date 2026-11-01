import {mpesaConfigured} from './mpesa';
import {paystackConfigured} from './paystack';
import {stripeConfigured} from './stripe';

/** Public configuration flags only. These do not certify merchant approval or
 * initiate a provider request; checkout still enforces its server-side gates. */
export function checkoutPaymentOptions(){
 return {mpesa:mpesaConfigured(),card:paystackConfigured()||stripeConfigured()};
}
