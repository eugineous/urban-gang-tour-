/** URL aliases select existing server-supported enquiry types, never a new workflow. */
const BOOKING_INTENTS={
 school:'School Booking',campus:'Campus Rave',public:'Mega Event',hosts:'Media',
 commercial:'Media',sponsorship:'Sponsorship',partnership:'Partnership',
} as const;
export function bookingTypeForIntent(intent:string){
 return Object.prototype.hasOwnProperty.call(BOOKING_INTENTS,intent)
  ? BOOKING_INTENTS[intent as keyof typeof BOOKING_INTENTS]:undefined;
}
