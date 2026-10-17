import { randomBytes } from "node:crypto";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  q: vi.fn(),
  active: true,
  account: {
    email: "fixture@example.invalid",
    role: "crew_admin",
    perms: ["site_seo", "gallery"],
  },
}));
vi.mock("@/lib/server/db", () => ({ hasDb: () => true, q: state.q }));
vi.mock("@/lib/server/admin-accounts", () => ({
  findAdminAccount: async () => state.account,
}));
vi.mock("@/lib/server/admin-sessions", () => ({
  adminSessionActive: async () => state.active,
  legacyAdminSessionAllowed: async () => false,
  recoveryStamp: () => null,
}));
vi.mock("@/lib/server/media-library", () => ({
  ensureMediaLibrarySchema: async () => {},
}));
vi.mock("@/lib/server/website-content", () => ({
  ensureWebsiteContentSchema: async () => {},
  invalidateWebsiteContent: () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
import { signToken } from "@/lib/server/session";
import { POST as website } from "@/app/api/admin/website/route";
import { POST as media } from "@/app/api/admin/media-library/route";
import { WEBSITE_DEFAULTS } from "@/lib/website-content";
vi.stubEnv("SESSION_SECRET", randomBytes(32).toString("hex"));
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  state.active = true;
  state.account = {
    email: "fixture@example.invalid",
    role: "crew_admin",
    perms: ["site_seo", "gallery"],
  };
  state.q.mockReset().mockResolvedValue([{ path: "/about", version: 1 }]);
});
const cookie = () =>
  signToken({
    role: "admin",
    authSource: "google_db",
    email: "fixture@example.invalid",
    scope: "super_admin",
    perms: [],
    sid: "a".repeat(64),
  });
const request = (
  body: unknown,
  token: string | null = cookie(),
  origin: string | null = "https://urbangangtour.co.ke",
) =>
  new Request("https://urbangangtour.co.ke/api/admin/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: "ugt_admin=" + token } : {}),
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
const draft = {
  action: "save",
  path: "/about",
  version: 0,
  content: WEBSITE_DEFAULTS["/about"],
};
it("rejects anonymous, tampered, expired and revoked sessions before database writes", async () => {
  for (const token of [null, cookie() + "x", signToken({ role: "admin" }, -1)])
    expect((await website(request(draft, token))).status).toBe(401);
  state.active = false;
  expect((await website(request(draft))).status).toBe(401);
  expect(state.q).not.toHaveBeenCalled();
});
it("uses current crew authority, not the owner scope embedded in an older signed cookie", async () => {
  expect((await website(request({ ...draft, action: "publish" }))).status).toBe(
    403,
  );
  expect(
    (await media(request({ action: "photo.publish", id: 1, version: 1 })))
      .status,
  ).toBe(403);
  expect(state.q).not.toHaveBeenCalled();
  expect((await website(request(draft))).status).toBe(200);
  state.q.mockClear();
  state.account.perms = [];
  expect((await website(request(draft))).status).toBe(403);
  expect(
    (
      await media(
        request({
          action: "photo.save",
          id: 1,
          version: 1,
          caption: "Caption",
          category: "School",
          altText: "Scene",
        }),
      )
    ).status,
  ).toBe(403);
  expect(state.q).not.toHaveBeenCalled();
});
it("requires an approved Origin even with a valid owner session", async () => {
  state.account.role = "super_admin";
  for (const origin of [null, "https://attacker.invalid"])
    expect((await website(request(draft, cookie(), origin))).status).toBe(403);
  expect(state.q).not.toHaveBeenCalled();
});
