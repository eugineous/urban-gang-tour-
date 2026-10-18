import { expect, it } from "vitest";
import { confirmedWebsitePage } from "@/lib/client/website-ack";
import { WEBSITE_DEFAULTS } from "@/lib/website-content";
const content = {
  ...WEBSITE_DEFAULTS["/about"],
  faqs: [{ question: "Question?", answer: "Answer." }],
};
const expected = {
  path: "/about",
  version: 1,
  action: "publish" as const,
  content,
};
it("confirms equivalent JSONB content regardless of top-level and nested key order", () => {
  const reordered = {
    faqs: [{ answer: "Answer.", question: "Question?" }],
    image: content.image,
    body: content.body,
    summary: content.summary,
    title: content.title,
  };
  expect(
    confirmedWebsitePage(
      { path: "/about", version: 2, draft: reordered, published: reordered },
      expected,
    ).published,
  ).toEqual(content);
});
it.each([
  { path: "/about", version: 1, draft: content, published: content },
  { path: "/faq", version: 2, draft: content, published: content },
  { path: "/about", version: 2, draft: content, published: null },
  {
    path: "/about",
    version: 2,
    draft: content,
    published: { ...content, title: "Different title" },
  },
  {
    path: "/about",
    version: 2,
    draft: { ...content, body: ["Wrong content"] },
    published: content,
  },
])(
  "does not announce publication for stale, wrong or incomplete acknowledgements",
  (page) => {
    expect(() => confirmedWebsitePage(page, expected)).toThrow();
  },
);
