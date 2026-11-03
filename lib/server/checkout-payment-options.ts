import {paystackConfigured} from './paystack';
import {paymentInitiationAllowed} from './payment-provider-policy';

/** Public configuration flags only. These do not certify merchant approval or
 * initiate a provider request; checkout still enforces its server-side gates. */
export function checkoutPaymentOptions(){
 return {mpesa:false,card:paymentInitiationAllowed('paystack')&&paystackConfigured()};
}
