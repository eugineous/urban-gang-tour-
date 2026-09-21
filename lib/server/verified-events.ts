// Verified real tour events, recovered from the pre-migration catalog.
//
// Provenance: these three ticketed events were the live, sellable catalogue in
// `public/v25-template.html` MAIN_EVENTS and `lib/server/catalog.ts`
// TICKET_TIERS until commit c276ecd collapsed the hardcoded copies into the
// DB-backed `tour_events` table (its message records that "price parity with
// the previous hardcoded values was verified against production before
// cutover"). The one-time bootstrap seed that carried them was later removed
// in commit 5b1bebc ("Remove stale catalog bootstrap fallbacks"), which left
// the catalogue with no ticketed rows at all.
//
// This is a RECOVERY of already-published commercial facts, not an invention:
// every field below (name, venue, city, tier names and prices, artwork,
// accent) is copied verbatim from that verified production data, and the
// names/prices are independently corroborated by live newsroom posts
// ("Color Blast Tickets: M-Pesa and Card Payment Guide", 2026-08-02;
// "The Experience Hub: UGT's Dance & Hype Partner", 2026-08-05;
// "Ashton Sounds: The Stage & Sound Partner Behind UGT", 2026-09-09).
//
// Deliberately NOT auto-published. The recovered dates are months old and
// carry internally inconsistent weekday labels in the original source
// ("Sat 16 Aug 2026" was a Sunday, "Sat 20 Sep 2026" a Sunday, "Fri 3 Oct
// 2026" a Saturday), so none of them can be trusted as the CURRENT schedule
// for an event that takes real money. UGT staff restore these into the
// Control Room as drafts, confirm the date, and publish — see
// app/admin/ops/Events.tsx ("Restore verified events").

export interface VerifiedEvent {
  id: string;
  kind: 'ticketed';
  name: string;
  eventDate: string | null;
  eventTime: string;
  venue: string;
  city: string;
  accent: string;
  image: string;
  description: string;
  tiers: { name: string; price: number }[];
  /**
   * Recovered date as it shipped. Shown to staff so they can confirm or
   * correct it before publishing — never used to publish automatically.
   */
  recoveredDateNote: string;
}

export const VERIFIED_EVENTS: VerifiedEvent[] = [
  {
    id: 'xp-dance',
    kind: 'ticketed',
    name: 'The Experience Hub Dance Event',
    eventDate: '2026-08-16',
    eventTime: '2:00 PM',
    venue: 'KICC Grounds',
    city: 'Nairobi',
    accent: '#E6218C',
    image: '/assets/gal/xp-dance.jpg',
    description: 'The dance takeover — crews, cyphers, hype sets and celebrity performances.',
    tiers: [
      { name: 'Regular', price: 500 },
      { name: 'VIP', price: 1500 },
      { name: 'VVIP Table', price: 5000 },
    ],
    recoveredDateNote: 'Shipped as "Sat 16 Aug 2026" (that date was a Sunday).',
  },
  {
    id: 'festival-colours',
    kind: 'ticketed',
    name: 'Urban Festival Of Colours',
    eventDate: '2026-09-20',
    eventTime: '11:00 AM',
    venue: 'Uhuru Gardens',
    city: 'Nairobi',
    accent: '#21C7E6',
    image: '/assets/gal/festival-colours.jpg',
    description: 'One field, a thousand colours, dancers, DJs and non-stop hype.',
    tiers: [
      { name: 'Early Bird', price: 800 },
      { name: 'Regular', price: 1200 },
      { name: 'VIP', price: 3000 },
    ],
    recoveredDateNote: 'Shipped as "Sat 20 Sep 2026" (that date was a Sunday).',
  },
  {
    id: 'campus-rave',
    kind: 'ticketed',
    name: 'Campus Rave — Nairobi Edition',
    eventDate: '2026-10-03',
    eventTime: '4:00 PM',
    venue: 'Carnivore Grounds',
    city: 'Nairobi',
    accent: '#FFD400',
    image: '/assets/gal/campus-rave.jpg',
    description: 'The tour, fully grown. Bigger stage, bigger sound, broadcast-ready.',
    tiers: [
      { name: 'Regular', price: 1000 },
      { name: 'VIP', price: 2500 },
      { name: 'VVIP', price: 6000 },
    ],
    recoveredDateNote: 'Shipped as "Fri 3 Oct 2026" (that date was a Saturday).',
  },
];
