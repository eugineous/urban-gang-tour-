import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  q: vi.fn(),
  session: true,
  perm: true,
  owner: true,
  origin: true,
  limit: true,
}));
vi.mock("@/lib/server/db", () => ({ q: state.q, hasDb: () => true }));
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
vi.mock("@/lib/server/media-library", () => ({
  ensureMediaLibrarySchema: async () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { GET, POST } from "@/app/api/admin/media-library/route";
const req = (data: unknown) =>
  new Request("https://urbangangtour.co.ke/api/admin/media-library", {
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
    limit: true,
  });
  state.q.mockResolvedValue([
    { id: 1, version: 3, url: "/media/gallery/fixture.png" },
  ]);
});
it("guards all gallery operations server-side and keeps replies private", async () => {
  for (const [key, status] of [
    ["session", 401],
    ["perm", 403],
    ["origin", 403],
    ["limit", 429],
  ] as const) {
    state[key] = false;
    const response = await POST(req({}));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toContain("no-store");
    state[key] = true;
  }
  expect(state.q).not.toHaveBeenCalled();
});
it("returns explicit photo and folder fields, not contacts or storage secrets", async () => {
  await GET(new Request("https://x.test/api"));
  expect(state.q.mock.calls[0][0]).not.toContain("SELECT *");
  expect(state.q.mock.calls[1][0]).toBe(
    "SELECT id,name,version FROM gallery_folders ORDER BY lower(name)",
  );
});
it.each(["photo.publish", "photo.unpublish", "photo.trash", "photo.restore"])(
  "requires owner approval for %s",
  async (action) => {
    state.owner = false;
    expect((await POST(req({ action, id: 1, version: 2 }))).status).toBe(403);
    expect(state.q).not.toHaveBeenCalled();
  },
);
it("uses guarded, audited metadata updates and protects published records from crew", async () => {
  state.owner = false;
  expect(
    (
      await POST(
        req({
          action: "photo.save",
          id: 1,
          version: 2,
          caption: "Original",
          category: "School",
          altText: "Visible scene",
        }),
      )
    ).status,
  ).toBe(200);
  const [sql, args] = state.q.mock.calls[0];
  expect(sql).toContain("version=$2");
  expect(sql).toContain("OR NOT published");
  expect(sql).toContain("INSERT INTO audit_log");
  expect(args.slice(0, 6)).toEqual([
    1,
    2,
    false,
    "Original",
    "School",
    "Visible scene",
  ]);
});
it("removes recoverably without deleting records or original bytes", async () => {
  expect(
    (await POST(req({ action: "photo.trash", id: 1, version: 2 }))).status,
  ).toBe(200);
  expect(state.q.mock.calls[0][0]).toContain(
    "published=false,removed_at=now()",
  );
  expect(state.q.mock.calls[0][0]).not.toMatch(/DELETE|mediaDel/);
  state.q.mockClear();
  await POST(req({ action: "photo.restore", id: 1, version: 2 }));
  expect(state.q.mock.calls[0][0]).toContain("published=false,removed_at=NULL");
});
it("rejects stale mutations and invalid payloads without erasing saved metadata", async () => {
  state.q.mockResolvedValue([]);
  expect(
    (
      await POST(
        req({
          action: "photo.save",
          id: 1,
          version: 2,
          caption: "Edited",
          category: "School",
          altText: "Scene",
        }),
      )
    ).status,
  ).toBe(409);
  state.q.mockClear();
  expect(
    (
      await POST(
        req({
          action: "photo.save",
          id: 1,
          version: 2,
          caption: "Edited",
          category: "School",
          altText: "Scene",
          published: true,
        }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        req({ action: "photo.move", id: 1, version: 2, folderId: "forged" }),
      )
    ).status,
  ).toBe(400);
  expect(state.q).not.toHaveBeenCalled();
});
it("creates a stable folder without altering photo publication", async () => {
  await POST(req({ action: "folder.create", name: "Tour archive" }));
  const [sql, args] = state.q.mock.calls[0];
  expect(args[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(args[1]).toBe("Tour archive");
  expect(sql).not.toContain("UPDATE gallery_photos");
});
