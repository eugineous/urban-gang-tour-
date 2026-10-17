import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
const state = vi.hoisted(() => ({ q: vi.fn(), configured: true }));
vi.mock("@/lib/server/db", () => ({
  q: state.q,
  hasDb: () => state.configured,
  qSchema: () => {
    throw Error("no public schema writes");
  },
}));
import {
  readWebsiteContent,
  invalidateWebsiteContent,
} from "@/lib/server/website-content";
import Site from "@/ui/components/Site";
import { WEBSITE_DEFAULTS } from "@/lib/website-content";
beforeEach(() => {
  state.q.mockReset();
  state.configured = true;
  for (const path of ["/", "/about", "/faq", "/author/eugine-micah"])
    invalidateWebsiteContent(path);
});
it("public reads request only the published document, never drafts, actors or history", async () => {
  state.q.mockResolvedValue([{ draft: { title: "PRIVATE" }, published: null }]);
  expect(await readWebsiteContent("/about")).toBeNull();
  expect(state.q).toHaveBeenCalledWith(
    "SELECT published FROM website_pages WHERE path=$1",
    ["/about"],
  );
  state.q.mockClear();
  expect(await readWebsiteContent("/admin")).toBeNull();
  expect(state.q).not.toHaveBeenCalled();
});
it("falls back without schema writes if storage is absent or a document is invalid", async () => {
  state.q.mockRejectedValue(Error("missing table"));
  expect(await readWebsiteContent("/about")).toBeNull();
  state.q.mockResolvedValue([{ published: { bad: true } }]);
  expect(await readWebsiteContent("/faq")).toBeNull();
});
it.each(["/about", "/faq", "/author/eugine-micah", "/"])(
  "renders published editable content on %s without executing markup",
  (path) => {
    const content = {
      ...WEBSITE_DEFAULTS[path],
      title: "Distinct fixture title",
      summary: "Published fixture summary",
      body: ["<script>never execute this</script>"],
      faqs: [{ question: "Fixture question?", answer: "Fixture answer." }],
    };
    const html = renderToStaticMarkup(
      createElement(Site, {
        path,
        query: {},
        screens: [],
        products: [],
        events: [],
        posts: [],
        pageContent: content,
      }),
    );
    expect(html).toContain("Distinct fixture title");
    expect(html).toContain("Published fixture summary");
    expect(html).not.toContain("<script>never execute");
    if (path === "/about" || path.startsWith("/author"))
      expect(html).toContain("&lt;script&gt;never execute this&lt;/script&gt;");
    if (path === "/faq") expect(html).toContain("Fixture question?");
  },
);
