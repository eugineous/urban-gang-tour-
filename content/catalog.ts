export interface CatalogItem {
  key: string;
  name: string;
  priceKes: number;
  variants?: string[];
}

// The approved v25 merch line (14 products), prices as approved in the
// design handoff. Apparel carries size variants; everything else adds
// directly to the cart.
export const MERCH_CATALOG: CatalogItem[] = [
  { key: "magenta-tee", name: "Magenta Oversized Tee", priceKes: 2500, variants: ["S", "M", "L", "XL", "XXL"] },
  { key: "crewneck", name: "Black Crewneck Sweatshirt", priceKes: 3800, variants: ["S", "M", "L", "XL", "XXL"] },
  { key: "snapback", name: "Structured Snapback", priceKes: 1800 },
  { key: "bucket-hat", name: "Bucket Hat", priceKes: 1600 },
  { key: "tote", name: "Canvas Tote", priceKes: 1200 },
  { key: "beanie", name: "Cuffed Beanie", priceKes: 1400 },
  { key: "bottle", name: "Insulated Bottle", priceKes: 2200 },
  { key: "wristbands", name: "Wristband Pack", priceKes: 500 },
  { key: "gym-sack", name: "Drawstring Gym Sack", priceKes: 1500 },
  { key: "baby-tee", name: "Cropped Baby Tee", priceKes: 2200, variants: ["S", "M", "L", "XL", "XXL"] },
  { key: "jersey", name: "Football Jersey", priceKes: 3200, variants: ["S", "M", "L", "XL", "XXL"] },
  { key: "waist-bag", name: "Crossbody Waist Bag", priceKes: 2000 },
  { key: "lanyard", name: "Woven Lanyard", priceKes: 400 },
  { key: "stickers", name: "Sticker Sheet", priceKes: 300 },
];

export interface TicketEvent {
  key: string;
  name: string;
  dateLabel: string;
  ticketTypes: CatalogItem[];
}

export const TICKET_EVENTS: TicketEvent[] = [
  {
    key: "lari-boys-19-jul",
    name: "Urban Gang Tour - Lari Boys High School",
    dateLabel: "Sunday, 19 July 2026 - Kimende, Lari, Kiambu County",
    ticketTypes: [{ key: "general", name: "General Entry", priceKes: 200 }],
  },
];

export function findCatalogItem(kind: "ticket" | "merch", eventKey: string | null, itemKey: string): CatalogItem | null {
  if (kind === "merch") return MERCH_CATALOG.find((i) => i.key === itemKey) ?? null;
  const event = TICKET_EVENTS.find((e) => e.key === eventKey);
  return event?.ticketTypes.find((t) => t.key === itemKey) ?? null;
}
