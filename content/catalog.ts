// PLACEHOLDER PRICES - nothing here has been confirmed by Eugine/Lucy yet.
// These exist so the checkout flow is testable end-to-end in the M-Pesa
// sandbox. Update the priceKes values (and add real ticketed events) before
// this ever goes live with a real Paybill/Till.
export interface CatalogItem {
  key: string;
  name: string;
  priceKes: number;
  variants?: string[];
}

export const MERCH_CATALOG: CatalogItem[] = [
  { key: "tee3d", name: "3D Logo Tee - Black", priceKes: 1500, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "puff", name: "Magenta Puff Tee", priceKes: 1500, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "hoodie", name: "Embroidered Hoodie", priceKes: 3000, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "pinkcity", name: "Pink City Tee", priceKes: 1500, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "babytee", name: "Baby Tee - White", priceKes: 1300, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "crewneck", name: "Crewneck - Black", priceKes: 2200, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "jersey", name: "Event Jersey", priceKes: 2500, variants: ["S", "M", "L", "XL", "2XL"] },
  { key: "cap", name: "Tour Cap", priceKes: 800 },
  { key: "buckethat", name: "Bucket Hat", priceKes: 900 },
  { key: "beanie", name: "Beanie - Black", priceKes: 700 },
  { key: "tote", name: "Gang Tote", priceKes: 600 },
  { key: "waistbag", name: "Waist Bag", priceKes: 1000 },
  { key: "drawstring", name: "Drawstring Bag", priceKes: 600 },
  { key: "bottle", name: "Water Bottle", priceKes: 700 },
  { key: "lanyard", name: "Lanyard", priceKes: 300 },
  { key: "wristbands", name: "Wristbands", priceKes: 200, variants: ["Black", "Magenta", "Orange"] },
  { key: "stickers", name: "Sticker Pack", priceKes: 250 },
];

export interface TicketEvent {
  key: string;
  name: string;
  dateLabel: string;
  ticketTypes: CatalogItem[];
}

export const TICKET_EVENTS: TicketEvent[] = [
  {
    key: "ngeya-girls-24-jul",
    name: "Ngeya Girls Senior School",
    dateLabel: "24 July 2026 - Mai Mahiu, Naivasha",
    ticketTypes: [{ key: "general", name: "General Entry", priceKes: 200 }],
  },
];

export function findCatalogItem(kind: "ticket" | "merch", eventKey: string | null, itemKey: string): CatalogItem | null {
  if (kind === "merch") return MERCH_CATALOG.find((i) => i.key === itemKey) ?? null;
  const event = TICKET_EVENTS.find((e) => e.key === eventKey);
  return event?.ticketTypes.find((t) => t.key === itemKey) ?? null;
}
