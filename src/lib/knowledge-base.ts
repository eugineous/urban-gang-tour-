import { createClient, SupabaseClient } from "@supabase/supabase-js";

type KBSections = "brand_voice" | "headline_guide" | "caption_guide" | "kenya_knowledge" | "gen_z_guide" | "video_topics" | "hashtag_strategy";

export interface KnowledgeSection {
  id: KBSections;
  title: string;
  content: string;
  updated_at?: string;
}

export type KnowledgeBase = Record<KBSections, KnowledgeSection>;

// Hard defaults act as safety net so AI never runs empty
export const KB_DEFAULTS: KnowledgeBase = {
  brand_voice: {
    id: "brand_voice",
    title: "Brand Voice & Identity",
    content: `PPP TV Kenya = bold, street-smart Gen Z Nairobi.
Tone: confident, witty, playful. Avoid stiff news-anchor language.
Perspective: we are the friend breaking the story first.
Must-haves: real names, places, numbers. Emoji max 3, never in every sentence.
Forbidden: clickbait lies, hashtags, politics unless explicitly tagged.`,
  },
  headline_guide: {
    id: "headline_guide",
    title: "Headline Writing Guide",
    content: `Format: ALL CAPS, 4–7 words. Name/verb first, numbers beat adjectives.
Prioritize: WHO did WHAT, WHERE. Use Kenyan names if present.
Ban: questions, quotes, emojis, filler words (breaking, shocking, unbelievable, viral).
Examples:
- KHALIGRAPH DROPS DISS AT NGONG RACE
- KIPCHOGE SMASHES BERLIN RECORD AGAIN
- NAIROBI DMV TURNS AWAY HUNDREDS AFTER CRASH`,
  },
  caption_guide: {
    id: "caption_guide",
    title: "Caption Writing Guide",
    content: `Structure (3 blocks):
1) Hook: one line, feels like a friend texting: "Wait— [name] just [action]?"
2) Body: 2–4 sentences with names, numbers, place, date. No fluff.
3) CTA: "Read more ??" or "Full story ??".
Limits: <=180 words, <=3 emojis total, no hashtags, no ALL CAPS body.
Prohibited openers: "In a shocking turn", "According to reports".`,
  },
  kenya_knowledge: {
    id: "kenya_knowledge",
    title: "Kenya Knowledge Base",
    content: `Keep Kenyan context accurate: counties, neighborhoods (Westlands, Rongai, Ngong, Umoja), clubs (Kibera Black Stars, Gor Mahia), venues (Kasarani, Nyayo), media (Citizen, NTV, KBC), regulators (DCI, KRA, NTSA), slang (254, mashariki, wasee). Spell Swahili words correctly (matatu, nyama choma, githeri).`,
  },
  gen_z_guide: {
    id: "gen_z_guide",
    title: "Gen Z Audience Guide",
    content: `Audience: 18–30, Nairobi first. Keep it light, energetic, zero lecturing.
Do: rhetorical asides, a little sarcasm, internet shorthand (fr, idk, ngl) sparingly.
Don’t: corporate tone, preachy takes, politics unless tagged as POLITICS.
Use 2–3 emojis max; prefer ???????? over ??????.`,
  },
  video_topics: {
    id: "video_topics",
    title: "Video Scraping Topics",
    content: `Prioritize: Kenyan entertainment, music drops, celeb drama, sports (Harambee Stars, FKF Premier League, EPL Kenyans), fashion collabs, campus culture, viral challenges.
Secondary: big global sports moments (NBA, F1, UCL), Afrobeats releases, African film/TV awards.
Skip: politics unless category=POLITICS, finance without Kenyan angle, generic tech press releases.`,
  },
  hashtag_strategy: {
    id: "hashtag_strategy",
    title: "Hashtag Strategy",
    content: `Do NOT place hashtags in caption body.
Platform appends: #PPPTV #Kenya #GenZ #Entertainment #254 if needed.
If platform forbids hashtags, omit entirely.`,
  },
};

let _client: SupabaseClient | null = null;
let _cache: KnowledgeBase | null = null;
let _loadedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

function mergeDefaults(rows: KnowledgeSection[] | null | undefined): KnowledgeBase {
  const base = { ...KB_DEFAULTS } as KnowledgeBase;
  (rows || []).forEach(r => {
    if (!r.id || !r.content) return;
    const id = r.id as KBSections;
    if (base[id]) {
      base[id] = { ...base[id], ...r, updated_at: r.updated_at } as KnowledgeSection;
    }
  });
  return base;
}

export async function loadKnowledgeBase(force = false): Promise<KnowledgeBase> {
  const now = Date.now();
  if (!force && _cache && now - _loadedAt < CACHE_TTL) return _cache;
  const client = getClient();
  if (!client) {
    _cache = KB_DEFAULTS;
    _loadedAt = now;
    return _cache;
  }
  try {
    const { data, error } = await client
      .from("knowledge_base")
      .select("id, title, content, updated_at");
    if (error) throw error;
    _cache = mergeDefaults(data || []);
    _loadedAt = now;
    return _cache;
  } catch (err) {
    console.warn("[kb] fallback to defaults:", (err as Error).message);
    _cache = KB_DEFAULTS;
    _loadedAt = now;
    return _cache;
  }
}

export async function saveKnowledgeSection(section: KnowledgeSection): Promise<KnowledgeBase> {
  const client = getClient();
  if (!client) throw new Error("Supabase not configured");
  const { id, title, content } = section;
  await client.from("knowledge_base").upsert({ id, title, content });
  _loadedAt = 0; // bust cache
  return loadKnowledgeBase(true);
}

export async function deleteKnowledgeSection(id: KBSections): Promise<KnowledgeBase> {
  const client = getClient();
  if (!client) throw new Error("Supabase not configured");
  await client.from("knowledge_base").delete().eq("id", id);
  _loadedAt = 0;
  return loadKnowledgeBase(true);
}

export function getDefaults(): KnowledgeBase {
  return KB_DEFAULTS;
}
