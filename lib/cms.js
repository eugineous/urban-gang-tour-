import redis from "./redis";
import { SOCIAL_LINKS } from "./social-links";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a JSON string stored in Redis; return null on failure. */
function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value; // already parsed by Upstash client
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Fetch all records for a given index key.
 * The index is a Redis set whose members are individual record keys.
 * @param {string} indexKey - e.g. "ugt:crew:index"
 * @returns {Promise<object[]>}
 */
async function getAllFromIndex(indexKey) {
  const keys = await redis.smembers(indexKey);
  if (!keys || keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values.map(parseJson).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

/** Read all crew members from ugt:crew:index */
export async function getCrew() {
  return getAllFromIndex("ugt:crew:index");
}

// ---------------------------------------------------------------------------
// Blog Posts
// ---------------------------------------------------------------------------

/**
 * Read all blog posts, optionally filtered by status.
 * The index is a sorted set scored by datePublished timestamp.
 * @param {"published"|"draft"|undefined} status - optional filter
 * @returns {Promise<object[]>}
 */
export async function getBlogPosts(status) {
  // zrange with REV returns members from high (newest) to low (oldest)
  const keys = await redis.zrange("ugt:blog:index", 0, -1, { rev: true });
  if (!keys || keys.length === 0) return [];
  const values = await redis.mget(...keys);
  const posts = values.map(parseJson).filter(Boolean);
  if (status) {
    return posts.filter((p) => p.status === status);
  }
  return posts;
}

// ---------------------------------------------------------------------------
// People / Profiles
// ---------------------------------------------------------------------------

/**
 * Read a single person profile by slug.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getPerson(slug) {
  const value = await redis.get(`ugt:people:${slug}`);
  return parseJson(value);
}

/**
 * Read all profiles from ugt:people:index.
 * @returns {Promise<object[]>}
 */
export async function getAllPeople() {
  return getAllFromIndex("ugt:people:index");
}

// ---------------------------------------------------------------------------
// Events / Tour Stops
// ---------------------------------------------------------------------------

/**
 * Read a single event by slug.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getEvent(slug) {
  const value = await redis.get(`ugt:events:${slug}`);
  return parseJson(value);
}

/**
 * Read all events from ugt:events:index (sorted by date ascending).
 * @returns {Promise<object[]>}
 */
export async function getAllEvents() {
  const keys = await redis.zrange("ugt:events:index", 0, -1);
  if (!keys || keys.length === 0) return [];
  const values = await redis.mget(...keys);
  return values.map(parseJson).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

/** Read all partners. */
export async function getPartners() {
  return getAllFromIndex("ugt:partners:index");
}

// ---------------------------------------------------------------------------
// Performers
// ---------------------------------------------------------------------------

/** Read all performers. */
export async function getPerformers() {
  return getAllFromIndex("ugt:performers:index");
}

// ---------------------------------------------------------------------------
// Shop Products
// ---------------------------------------------------------------------------

/** Read all shop products. */
export async function getShopProducts() {
  return getAllFromIndex("ugt:shop:index");
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

/**
 * Read a single gallery album by slug.
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
export async function getGalleryAlbum(slug) {
  const value = await redis.get(`ugt:gallery:${slug}`);
  return parseJson(value);
}

/** Read all gallery albums. */
export async function getAllGalleryAlbums() {
  return getAllFromIndex("ugt:gallery:index");
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

/** Read all FAQs, sorted by their `order` field if present. */
export async function getFaqs() {
  const faqs = await getAllFromIndex("ugt:faqs:index");
  return faqs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

/** Read all testimonials, sorted by their `order` field if present. */
export async function getTestimonials() {
  const testimonials = await getAllFromIndex("ugt:testimonials:index");
  return testimonials.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// Site Settings
// ---------------------------------------------------------------------------

/** Read the ugt:settings hash. */
export async function getSettings() {
  const value = await redis.get("ugt:settings");
  return parseJson(value);
}

// ---------------------------------------------------------------------------
// Social Links
// ---------------------------------------------------------------------------

/**
 * Read social links from Redis (ugt:social).
 * Falls back to the SOCIAL_LINKS constant if the key is not in Redis.
 * @returns {Promise<object>}
 */
export async function getSocialLinks() {
  const value = await redis.get("ugt:social");
  const parsed = parseJson(value);
  if (!parsed) return SOCIAL_LINKS;
  // Merge with constant to ensure all keys are always present
  return { ...SOCIAL_LINKS, ...parsed };
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

/** Read the active announcement from ugt:announcements:active. */
export async function getActiveAnnouncement() {
  const value = await redis.get("ugt:announcements:active");
  return parseJson(value);
}

// ---------------------------------------------------------------------------
// Per-page SEO
// ---------------------------------------------------------------------------

/**
 * Read per-page SEO settings from ugt:seo:{pageKey}.
 * @param {string} pageKey - e.g. "home", "events", "crew"
 * @returns {Promise<object|null>}
 */
export async function getSeoForPage(pageKey) {
  const value = await redis.get(`ugt:seo:${pageKey}`);
  return parseJson(value);
}

// ---------------------------------------------------------------------------
// Ticket Orders
// ---------------------------------------------------------------------------

/**
 * Read all ticket orders from ugt:orders:index.
 * Returns orders sorted newest-first by timestamp.
 * @returns {Promise<object[]>}
 */
export async function getTicketOrders() {
  const keys = await redis.smembers("ugt:orders:index");
  if (!keys || keys.length === 0) return [];
  const values = await redis.mget(...keys);
  const orders = values.map(parseJson).filter(Boolean);
  return orders.sort(
    (a, b) => new Date(b.timestamp ?? 0) - new Date(a.timestamp ?? 0)
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a social URL starts with https://.
 * @param {string} url
 * @returns {boolean}
 */
export function validateSocialUrl(url) {
  if (typeof url !== "string") return false;
  return url.startsWith("https://");
}
