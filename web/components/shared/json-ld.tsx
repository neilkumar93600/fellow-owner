/**
 * Structured data as a JSON-LD script (Next's JSON-LD guide). `<` is escaped so a value such as a bio
 * can never close the tag. Server-rendered: crawlers read it in the first HTML.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON, with < escaped.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
