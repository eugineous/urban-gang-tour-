import {SITE} from './site';

/** One useful comparison guide, not competitor-specific keyword doorway pages. */
export const TICKETING_GUIDE={
 path:'/ticketing',
 title:'Event Ticketing in Kenya — Compare Urban Gang Tour',
 description:'Looking for a Mookh, Ticketsasa, mTickets or HustleSasa alternative? Explore Urban Gang Tour event listings, ticket options and organiser enquiries in Kenya.',
 image:'/assets/gal/koinange.jpg',
} as const;

// Official destinations are already supplied by the owner or source directory.
// Listing a platform is not a claim about its current prices or functionality.
export const TICKETING_ALTERNATIVES=[
 {name:'Mookh',url:'https://mookh.com/'},
 {name:'Ticketsasa',url:'https://www.ticketsasa.com/'},
 {name:'mTickets',url:'https://mtickets.com/'},
 {name:'HustleSasa',url:'https://hustlesasa.com/'},
] as const;

export const TICKETING_CRITERIA=[
 {title:'Who is selling?',text:'Check the organiser, venue, admission rules and seller. An advertised partner event may sell tickets on another platform.'},
 {title:'What will you pay?',text:'Compare the final payable total, payment methods and refund terms for your event—not just the headline ticket price.'},
 {title:'What happens after payment?',text:'Look for a clear payment status, an order reference, a receipt and instructions for accessing the ticket.'},
 {title:'Who helps at the gate?',text:'Confirm ticket validation, organiser support and how a duplicate, cancelled or refunded ticket is handled.'},
] as const;

export const TICKETING_WORKFLOW=[
 {title:'Find the event',text:'Browse published events and original artwork. Each event page carries its organiser, date, venue and admission details.'},
 {title:'Check the ticket options',text:'On-site checkout appears only when ticket sales are enabled. Guest checkout is supported; the available payment route is shown before you pay.'},
 {title:'Follow the payment status',text:'A pending payment is not a paid ticket. Keep your order reference and check its status before starting another payment.'},
 {title:'Keep the receipt and ticket',text:'Confirmed ticket purchases provide access to their receipt and issued tickets. QR admission checks use the ticket’s paid and unused status.'},
] as const;

export const TICKETING_QUESTIONS=[
 {question:'Can I buy every event ticket on Urban Gang Tour?',answer:'No. Some listings advertise another organiser’s event. The event page identifies the ticket seller and any external ticket link. School-only events are not public ticket sales.'},
 {question:'Can an organiser list an event without selling tickets here?',answer:'Yes. Partner listings can identify another ticket seller, free admission, invitation-only access or admission details that are still to be confirmed.'},
 {question:'Can I use the platform from outside Kenya?',answer:'You can browse public listings from abroad. Confirm the event country, supported payment method and service scope with the team before making a booking or paying. Regional availability is not automatic.'},
] as const;

export function ticketingGuideStructuredData(){
 const url=SITE.domain+TICKETING_GUIDE.path;
 return [
  {'@context':'https://schema.org','@type':'WebPage','@id':url+'#page',url,name:TICKETING_GUIDE.title,description:TICKETING_GUIDE.description,
   inLanguage:'en-KE',isPartOf:{'@id':SITE.domain+'/#website'},about:{'@type':'Service',name:'Event listings and ticketing',provider:{'@id':SITE.domain+'/#org'}},
   primaryImageOfPage:{'@type':'ImageObject',url:SITE.domain+TICKETING_GUIDE.image}},
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
   {'@type':'ListItem',position:1,name:'Home',item:SITE.domain},
   {'@type':'ListItem',position:2,name:'Event ticketing',item:url},
  ]},
 ];
}
