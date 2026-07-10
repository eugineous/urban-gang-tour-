// Renders one or more JSON-LD objects as <script type="application/ld+json">.
// Server-rendered, so crawlers get the structured data directly in the HTML.
// Escape < / > / & to their \uXXXX forms: some payloads carry database or
// user-submitted text (post headlines, moderated review bodies) and a literal
// "</script>" inside JSON.stringify output would otherwise break out of the
// script tag (XSS). The escaped form stays valid JSON-LD for crawlers.
function safeJson(item: unknown): string {
  return JSON.stringify(item)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.filter(Boolean).map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(item) }}
        />
      ))}
    </>
  );
}
