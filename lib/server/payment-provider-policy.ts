/** Owner policy for NEW payment initiation, independent of stored credentials.
 * Historical signed callbacks, reconciliation and read-only recovery do not use
 * this gate: an existing payment must still be accounted for safely. */
export function paymentInitiationAllowed(provider:'paystack'|'mpesa'|'stripe'):boolean {
 return provider==='paystack';
}
