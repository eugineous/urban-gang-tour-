import fs from "node:fs";
import path from "node:path";

// The homepage used to be a client-side redirect to /Home.dc.html, which
// meant Googlebot (and anyone without JS) saw an empty 307 with no title,
// description, or content. Home.dc.html itself is a static, mostly
// server-renderable file (real marketing copy in the raw HTML, a small
// inline script for scroll-reveal animation) - so instead of redirecting,
// serve its body directly at "/" with a real 200 response. The page
// <title>/description already come from the root layout's metadata,
// which the old redirect never let render.
function readHomeMarkup() {
  const filePath = path.join(process.cwd(), "public", "Home.dc.html");
  const html = fs.readFileSync(filePath, "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : html;
}

export default function Home() {
  const bodyHtml = readHomeMarkup();
  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
