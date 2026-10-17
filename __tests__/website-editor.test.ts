import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  q: vi.fn(),
  session: true,
  perm: true,
  owner: true,
  origin: true,
  configured: true,
  limit: true,
  ensure: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/lib/server/db", () => ({
  q: state.q,
  hasDb: () => state.configured,
}));
vi.mock("@/lib/server/session", () => ({
  verifyAdminSession: async () => state.session,
  hasPerm: () => state.perm,
  isSuperAdmin: () => state.owner,
  adminActor: () => "fixture-editor",
}));
vi.mock("@/lib/server/origin", () => ({ requireOrigin: () => state.origin }));
vi.mock("@/lib/server/ratelimit", () => ({
  rateLimit: () => state.limit,
  clientIp: () => "fixture",
}));
vi.mock("@/lib/server/website-content", () => ({
  ensureWebsiteContentSchema: state.ensure,
  invalidateWebsiteContent: state.invalidate,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { GET, POST } from "@/app/api/admin/website/route";
import { WEBSITE_DEFAULTS, websiteContent } from "@/lib/website-content";
const content = WEBSITE_DEFAULTS["/about"];
const req = (data: unknown) =>
  new Request("https://urbangangtour.co.ke/api/admin/website", {
    method: "POST",
    headers: {
      origin: "https://urbangangtour.co.ke",
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, {
    session: true,
    perm: true,
    owner: true,
    origin: true,
    configured: true,
    limit: true,
  });
  state.q.mockResolvedValue([]);
});
it("guards session, permission, Origin, rate and database without writes", async () => {
  for (const [key, status] of [
    ["session", 401],
    ["perm", 403],
    ["origin", 403],
    ["limit", 429],
    ["configured", 503],
  ] as const) {
    state[key] = false;
    expect((await POST(req({}))).status).toBe(status);
    state[key] = true;
  }
  expect(state.q).not.toHaveBeenCalled();
});
it("returns default drafts privately and never bootstraps on an invalid path", async () => {
  expect(
    (await GET(new Request("https://x.test/api?path=/unknown"))).status,
  ).toBe(400);
  expect(state.ensure).not.toHaveBeenCalled();
  const response = await GET(new Request("https://x.test/api?path=/about"));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).page).toMatchObject({
    draft: content,
    published: null,
    version: 0,
  });
});
it("lets staff save drafts but only the owner publish", async () => {
  state.owner = false;
  expect(
    (
      await POST(
        req({ action: "publish", path: "/about", version: 0, content }),
      )
    ).status,
  ).toBe(403);
  state.q.mockResolvedValue([
    { path: "/about", draft: content, published: null, version: 1 },
  ]);
  expect(
    (await POST(req({ action: "save", path: "/about", version: 0, content })))
      .status,
  ).toBe(200);
  expect(state.q.mock.calls[0][1][3]).toBe(false);
  expect(state.invalidate).not.toHaveBeenCalled();
});
it("parameterizes content and atomically writes its guarded version, history and audit", async () => {
  state.q.mockResolvedValue([
    { path: "/about", draft: content, published: content, version: 4 },
  ]);
  expect(
    (
      await POST(
        req({ action: "publish", path: "/about", version: 3, content }),
      )
    ).status,
  ).toBe(200);
  const [sql, args] = state.q.mock.calls[0];
  expect(sql).toContain("version=$3");
  expect(sql).toContain("INSERT INTO website_page_versions");
  expect(sql).toContain("INSERT INTO audit_log");
  expect(sql).not.toContain(content.summary);
  expect(args[2]).toBe(3);
  expect(args[3]).toBe(true);
  expect(state.invalidate).toHaveBeenCalledWith("/about");
});
it("returns a stale-version conflict without claiming publication", async () => {
  expect(
    (
      await POST(
        req({ action: "publish", path: "/about", version: 1, content }),
      )
    ).status,
  ).toBe(409);
  expect(state.invalidate).not.toHaveBeenCalled();
});
it("restores a selected historical draft without publishing it", async () => {
  state.q
    .mockResolvedValueOnce([{ draft: content }])
    .mockResolvedValueOnce([
      { path: "/about", draft: content, published: null, version: 4 },
    ]);
  expect(
    (
      await POST(
        req({
          action: "restore",
          path: "/about",
          version: 3,
          sourceVersion: 1,
        }),
      )
    ).status,
  ).toBe(200);
  expect(state.q.mock.calls[1][1][3]).toBe(false);
  expect(state.invalidate).not.toHaveBeenCalled();
});
it("rejects unknown fields, incomplete questions, unsafe images and oversized bodies", async () => {
  expect(() => websiteContent({ ...content, html: "<script>" })).toThrow();
  expect(() =>
    websiteContent({ ...content, image: "javascript:alert(1)" }),
  ).toThrow();
  expect(() =>
    websiteContent({ ...content, faqs: [{ question: "Q", answer: "" }] }),
  ).toThrow();
  expect(
    (
      await POST(
        req({
          action: "save",
          path: "/about",
          version: 0,
          content,
          admin: true,
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        req({
          action: "save",
          path: "/about",
          version: 0,
          content: { ...content, summary: "x".repeat(151000) },
        }),
      )
    ).status,
  ).toBe(413);
  expect(state.q).not.toHaveBeenCalled();
});
