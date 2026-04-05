import { GoogleGenAI } from "@google/genai";
import { Article } from "./types";
import { loadKnowledgeBase, KB_DEFAULTS } from "./knowledge-base";

export interface AIContent {
  clickbaitTitle: string;
  caption: string;
}

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";
const HEADLINE_WORD_MIN = 4;
const HEADLINE_WORD_MAX = 7;
const CAPTION_WORD_MAX = 180;
const EMOJI_MAX = 3;

const BANNED_HEADLINE = ["BREAKING", "SHOCKING", "UNBELIEVABLE", "MUST SEE", "VIRAL", "TRENDING", "THIS IS CRAZY"];
const FILLER = ["in a shocking turn", "according to reports", "sources say", "rumors", "allegedly"];

let _gemini: GoogleGenAI | null = null;
function getGeminiClient(apiKey: string): GoogleGenAI {
  if (!_gemini) _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

function trimWords(text: string, min = HEADLINE_WORD_MIN, max = HEADLINE_WORD_MAX): string {
  const parts = text.split(/\s+/).filter(Boolean);
  const sliced = parts.slice(0, max);
  if (sliced.length < min) return parts.slice(0, min).join(" ");
  return sliced.join(" ");
}

function scrubHeadline(raw: string): string {
  const up = raw.replace(/^"|"$/g, "").toUpperCase();
  let cleaned = up;
  BANNED_HEADLINE.forEach(b => { cleaned = cleaned.replace(new RegExp(b, "gi"), ""); });
  cleaned = cleaned.replace(/[^A-Z0-9\s:'-]/g, " ").replace(/\s+/g, " ").trim();
  cleaned = trimWords(cleaned);
  return cleaned;
}

function stripLeadingHeadline(caption: string, headline: string): string {
  const lines = caption.split("\n");
  const first = lines[0].trim();
  if (!first) return caption;
  const h = headline.toLowerCase().slice(0, 60);
  if (first.toLowerCase().includes(h) || first === first.toUpperCase()) {
    lines.shift();
    while (lines[0] === "") lines.shift();
    return lines.join("\n");
  }
  return caption;
}

function limitEmojis(text: string): string {
  const chars = Array.from(text);
  let emojiCount = 0;
  const filtered = chars.filter(ch => {
    const cp = ch.codePointAt(0) ?? 0;
    // Rough emoji range without ES2018 regex props
    const isEmoji = cp >= 0x1f300 && cp <= 0x1fae0;
    if (isEmoji) {
      if (emojiCount >= EMOJI_MAX) return false;
      emojiCount += 1;
    }
    return true;
  });
  return filtered.join("");
}

function wordClamp(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ").trim();
}

async function generateWithNvidia(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");

  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.65,
      max_tokens: 800,
      top_p: 0.9,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`NVIDIA API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateHeadline(article: Article, kb = KB_DEFAULTS): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  const client = getGeminiClient(apiKey);
  const prompt =
    `${kb.headline_guide.content}\n\n` +
    `Write one ALL CAPS headline for this article in ${HEADLINE_WORD_MIN}-${HEADLINE_WORD_MAX} words. Use real facts and names. No emojis, no hashtags.\n` +
    `TITLE: ${article.title}\nCATEGORY: ${article.category}\nSUMMARY: ${(article.summary || "").slice(0, 400)}\n`;

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.6, maxOutputTokens: 80 },
  });
  const text = response.text?.trim() || article.title;
  return scrubHeadline(text);
}

async function generateCaption(article: Article, kb = KB_DEFAULTS, content: string): Promise<string> {
  const systemPrompt = `${kb.brand_voice.content}\n\n${kb.caption_guide.content}\n\n${kb.gen_z_guide.content}\n\n${kb.kenya_knowledge.content}`;
  const userPrompt = `Write a PPP TV Kenya caption.\nTITLE: ${article.title}\nCATEGORY: ${article.category}\nSOURCE: ${article.sourceName || "unknown"}\n${content ? `ARTICLE:\n${content}\n` : ""}`;
  const primary = await generateWithNvidia(userPrompt, systemPrompt);
  return primary;
}

function buildExcerptCaption(article: Article): string {
  const body = article.fullBody?.trim() || article.summary?.trim() || article.title;
  const cleaned = body.split(/\n+/).join(" ").replace(/\s+/g, " ").slice(0, 400);
  return `${cleaned}\n\nRead more ??`;
}

export async function generateAIContent(article: Article, options?: { isVideo?: boolean; videoType?: string }): Promise<AIContent> {
  const kb = await loadKnowledgeBase().catch(() => KB_DEFAULTS);

  const content = (article.fullBody?.trim().length ?? 0) > 50
    ? article.fullBody!.trim().slice(0, 2000)
    : (article.summary?.trim() ?? "");

  let clickbaitTitle = article.title;
  let caption = "";

  // Headline
  try {
    clickbaitTitle = await generateHeadline(article, kb);
  } catch (err: any) {
    console.warn("[gemini] headline fallback:", err.message);
    clickbaitTitle = scrubHeadline(article.title);
  }

  // Caption
  try {
    caption = await generateCaption({ ...article, title: clickbaitTitle }, kb, content);
  } catch (err: any) {
    console.warn("[caption] primary failed:", err.message);
  }

  // Gemini fallback if caption failed
  if (!caption) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const client = getGeminiClient(apiKey);
        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${kb.caption_guide.content}\nWrite a caption for: ${article.title}\n${content}`,
          config: { temperature: 0.7, maxOutputTokens: 400 },
        });
        caption = response.text?.trim() || "";
      }
    } catch (err: any) {
      console.warn("[gemini] caption fallback failed:", err.message);
    }
  }

  if (!caption || caption.length < 40) caption = buildExcerptCaption(article);

  // Cleanup
  caption = stripLeadingHeadline(caption, clickbaitTitle);
  caption = caption.replace(new RegExp(FILLER.join("|"), "gi"), "");
  caption = caption.replace(/#\w+/g, "");
  caption = limitEmojis(caption);
  caption = wordClamp(caption, CAPTION_WORD_MAX);
  caption = caption.trim();

  return { clickbaitTitle, caption };
}
