/**
 * JsonLd — server component that injects a JSON-LD structured data script tag.
 *
 * Usage in a page or layout:
 *   <JsonLd schema={{ "@context": "https://schema.org", "@type": "Event", ... }} />
 *
 * The component renders no visible UI — only a <script> tag in the document.
 *
 * @param {{ schema: object }} props
 */
export default function JsonLd({ schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
