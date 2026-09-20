// Validation shared by the organizer event create and edit routes. These
// fields become the public event listing and the server-side checkout catalog,
// so they must be complete and typed before an organizer can submit them.

export type OrganizerTier = { name: string; price: number };

export type OrganizerEventFields = {
  name: string;
  eventDate: string;
  venue: string;
  city: string;
  description: string;
  image: string;
  tiers: OrganizerTier[];
};

export type OrganizerEventPatch = Partial<OrganizerEventFields>;

const EVENT_FIELDS = new Set([
  "name",
  "eventDate",
  "venue",
  "city",
  "description",
  "image",
  "tiers",
]);

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length <= max ? result : null;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function todayInNairobi(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function imageUrl(value: unknown): string | null {
  const image = text(value, 400);
  if (image === null) return null;
  if (!image) return "";
  if (image.startsWith("/") && !image.startsWith("//")) return image;
  try {
    return new URL(image).protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}

function tiers(value: unknown): OrganizerTier[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return null;
  const labels = new Set<string>();
  const result: OrganizerTier[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const name = text((candidate as { name?: unknown }).name, 60);
    const price = (candidate as { price?: unknown }).price;
    if (!name || typeof price !== "number" || !Number.isSafeInteger(price) || price < 0 || price > 100_000_000)
      return null;
    const key = name.toLocaleLowerCase();
    if (labels.has(key)) return null;
    labels.add(key);
    result.push({ name, price });
  }
  return result;
}

// Parse a partial patch first. The edit route can then merge it with the
// stored record and validate the complete event, without silently turning an
// invalid value into a different one such as a zero-price tier.
export function parseOrganizerEventPatch(body: unknown):
  | { ok: true; patch: OrganizerEventPatch }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "invalid_body" };
  for (const key of Object.keys(body)) {
    if (!EVENT_FIELDS.has(key)) return { ok: false, error: `unexpected_field:${key}` };
  }
  const input = body as Record<string, unknown>;
  const patch: OrganizerEventPatch = {};
  if ("name" in input) {
    const value = text(input.name, 200);
    if (value === null) return { ok: false, error: "invalid_name" };
    patch.name = value;
  }
  if ("eventDate" in input) {
    const value = input.eventDate;
    if (typeof value !== "string" || !isCalendarDate(value))
      return { ok: false, error: "invalid_event_date" };
    patch.eventDate = value;
  }
  if ("venue" in input) {
    const value = text(input.venue, 300);
    if (value === null) return { ok: false, error: "invalid_venue" };
    patch.venue = value;
  }
  if ("city" in input) {
    const value = text(input.city, 100);
    if (value === null) return { ok: false, error: "invalid_city" };
    patch.city = value;
  }
  if ("description" in input) {
    const value = text(input.description, 2000);
    if (value === null) return { ok: false, error: "invalid_description" };
    patch.description = value;
  }
  if ("image" in input) {
    const value = imageUrl(input.image);
    if (value === null) return { ok: false, error: "invalid_image_url" };
    patch.image = value;
  }
  if ("tiers" in input) {
    const value = tiers(input.tiers);
    if (!value) return { ok: false, error: "invalid_ticket_tiers" };
    patch.tiers = value;
  }
  return { ok: true, patch };
}

export function validateOrganizerEvent(fields: OrganizerEventPatch):
  | { ok: true; value: OrganizerEventFields }
  | { ok: false; error: string } {
  const name = fields.name || "";
  const eventDate = fields.eventDate || "";
  const venue = fields.venue || "";
  const city = fields.city || "";
  const description = fields.description || "";
  const image = fields.image || "";
  const eventTiers = fields.tiers || [];
  if (name.length < 2) return { ok: false, error: "missing_name" };
  if (!isCalendarDate(eventDate)) return { ok: false, error: "event_date_required" };
  if (eventDate < todayInNairobi()) return { ok: false, error: "event_date_in_past" };
  if (!venue) return { ok: false, error: "venue_required" };
  if (!city) return { ok: false, error: "city_required" };
  if (!description) return { ok: false, error: "description_required" };
  const checkedImage = imageUrl(image);
  if (checkedImage === null) return { ok: false, error: "invalid_image_url" };
  const checkedTiers = tiers(eventTiers);
  if (!checkedTiers) return { ok: false, error: "invalid_ticket_tiers" };
  return {
    ok: true,
    value: {
      name,
      eventDate,
      venue,
      city,
      description,
      image: checkedImage,
      tiers: checkedTiers,
    },
  };
}
