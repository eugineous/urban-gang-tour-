import satori from "satori";
import sharp from "sharp";
import { Article } from "./types";
import { PPP_LOGO_B64 } from "./ppp-logo-b64";

const DEFAULT_RATIO = "9:16";

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  CELEBRITY:     { bg: "#FF007A", text: "#FFFFFF" },
  FASHION:       { bg: "#ec4899", text: "#FFFFFF" },
  MUSIC:         { bg: "#a855f7", text: "#FFFFFF" },
  "TV & FILM":   { bg: "#f59e0b", text: "#000000" },
  MOVIES:        { bg: "#f59e0b", text: "#000000" },
  LIFESTYLE:     { bg: "#14b8a6", text: "#FFFFFF" },
  EVENTS:        { bg: "#10b981", text: "#FFFFFF" },
  "EAST AFRICA": { bg: "#06b6d4", text: "#000000" },
  COMEDY:        { bg: "#eab308", text: "#000000" },
  INFLUENCERS:   { bg: "#f97316", text: "#FFFFFF" },
  SPORTS:        { bg: "#3b82f6", text: "#FFFFFF" },
  BUSINESS:      { bg: "#FFD700", text: "#000000" },
  AWARDS:        { bg: "#FFD700", text: "#000000" },
  ENTERTAINMENT: { bg: "#a855f7", text: "#FFFFFF" },
  POLITICS:      { bg: "#FF007A", text: "#FFFFFF" },
  NEWS:          { bg: "#FF007A", text: "#FFFFFF" },
  TECHNOLOGY:    { bg: "#06b6d4", text: "#000000" },
  HEALTH:        { bg: "#10b981", text: "#FFFFFF" },
  SCIENCE:       { bg: "#3b82f6", text: "#FFFFFF" },
  GENERAL:       { bg: "#E50914", text: "#FFFFFF" },
};

function getCatColor(category: string): { bg: string; text: string } {
  return CAT_COLORS[category.toUpperCase()] ?? { bg: "#E50914", text: "#FFFFFF" };
}

let _fontCache: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (_fontCache) return _fontCache;
  const sources = [
    "https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.8/files/bebas-neue-latin-400-normal.woff",
    "https://cdn.jsdelivr.net/npm/@fontsource/oswald@5.0.8/files/oswald-latin-700-normal.woff",
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (res.ok) { _fontCache = await res.arrayBuffer(); return _fontCache; }
    } catch { /* try next */ }
  }
  throw new Error("Could not load font");
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (url.startsWith("data:")) {
      const base64 = url.split(",")[1];
      return Buffer.from(base64, "base64");
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

function getDimensions(ratio: string): { w: number; h: number } {
  if (ratio === "4:5") return { w: 1080, h: 1350 };
  return { w: 1080, h: 1920 }; // 9:16 default
}

function getHeadlineFontSize(title: string): number {
  const chars = title.length;
  if (chars <= 20) return 170;
  if (chars <= 30) return 150;
  if (chars <= 40) return 128;
  if (chars <= 55) return 112;
  if (chars <= 70) return 96;
  if (chars <= 90) return 82;
  if (chars <= 110) return 70;
  return 60;
}

export interface ImageOptions {
  isBreaking?: boolean;
  ratio?: "9:16" | "4:5";
}

export async function generateImage(article: Article, opts: ImageOptions = {}): Promise<Buffer> {
  if (!article.imageUrl || article.imageUrl.trim() === "") {
    throw new Error("NO_IMAGE: article has no imageUrl — skipping");
  }

  const ratio = opts.ratio || DEFAULT_RATIO;
  const { w: W, h: H } = getDimensions(ratio);

  const [fontData, rawBg] = await Promise.all([
    loadFont(),
    fetchImageBuffer(article.imageUrl),
  ]);

  if (!rawBg) throw new Error("NO_IMAGE: could not fetch imageUrl — skipping");

  let bgBase64: string | null = null;
  try {
    const resized = await sharp(rawBg)
      .resize(W, H, { fit: "cover", position: "attention" })
      .jpeg({ quality: 88 })
      .toBuffer();
    bgBase64 = `data:image/jpeg;base64,${resized.toString("base64")}`;
  } catch { bgBase64 = null; }

  const category = article.category.toUpperCase();
  const { bg: catBg, text: catText } = getCatColor(category);
  const title = article.title.toUpperCase();
  const fontSize = getHeadlineFontSize(title);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svg = await (satori as any)(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          width: W,
          height: H,
          position: "relative",
          backgroundColor: "#000",
          overflow: "hidden",
          fontFamily: "BebasNeue",
        },
        children: [
          bgBase64
            ? {
                type: "img",
                props: {
                  src: bgBase64,
                  style: {
                    position: "absolute", top: 0, left: 0,
                    width: W, height: H,
                    objectFit: "cover", objectPosition: "center top",
                  },
                },
              }
            : {
                type: "div",
                props: {
                  style: { position: "absolute", top: 0, left: 0, width: W, height: H, background: "#111" },
                  children: [],
                },
              },

          // Gradient overlay
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute", left: 0, right: 0, top: 0, height: H,
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.9) 75%, rgba(0,0,0,1) 90%)",
              },
              children: [],
            },
          },

          // Top ticker bar
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 70,
                background: "rgba(0,0,0,0.75)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 32px",
                borderBottom: "2px solid rgba(255,255,255,0.08)",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: { color: "#ff4d4f", fontSize: 30, letterSpacing: 1, fontWeight: 800 },
                    children: "PPP TV KENYA",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: { color: "#ddd", fontSize: 18, letterSpacing: 1, fontWeight: 700 },
                    children: "24/7 GEN Z ENTERTAINMENT",
                  },
                },
              ],
            },
          },

          // Logo under ticker
          {
            type: "div",
            props: {
              style: { position: "absolute", top: 90, left: 40, display: "flex" },
              children: [{
                type: "img",
                props: {
                  src: PPP_LOGO_B64,
                  style: { width: 240, height: 96, objectFit: "contain" },
                },
              }],
            },
          },

          // Bottom content
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                padding: "0 44px 56px 44px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignSelf: "flex-start",
                      backgroundColor: catBg,
                      paddingLeft: 30, paddingRight: 30,
                      paddingTop: 14, paddingBottom: 14,
                      borderRadius: 50,
                      marginBottom: 24,
                    },
                    children: [{
                      type: "span",
                      props: {
                        style: { color: catText, fontSize: 38, fontWeight: 700, letterSpacing: 4, lineHeight: 1 },
                        children: category,
                      },
                    }],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexWrap: "wrap",
                      fontSize: fontSize,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: 1.0,
                      letterSpacing: 2,
                      marginBottom: 32,
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignSelf: "flex-start",
                      backgroundColor: catBg,
                      paddingLeft: 34, paddingRight: 34,
                      paddingTop: 16, paddingBottom: 16,
                      borderRadius: 50,
                    },
                    children: [{
                      type: "span",
                      props: {
                        style: { color: catText, fontSize: 34, fontWeight: 700, letterSpacing: 5, lineHeight: 1 },
                        children: "FOLLOW FOR MORE",
                      },
                    }],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: W,
      height: H,
      fonts: [{ name: "BebasNeue", data: fontData, weight: 700, style: "normal" }],
    }
  );

  return sharp(Buffer.from(svg)).resize(W, H).jpeg({ quality: 93 }).toBuffer();
}
