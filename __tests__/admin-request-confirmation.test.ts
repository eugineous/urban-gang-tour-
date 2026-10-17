import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/app/admin/ops/ui";
afterEach(() => vi.unstubAllGlobals());
it("does not call an empty HTTP 200 response a successful admin change", async () => {
  vi.stubGlobal("fetch", async () => new Response("{}"));
  const result = await api("/api/admin/ops", { method: "POST" });
  expect(result.data.error).toMatch(/did not confirm/);
});
it("turns network exceptions into actionable results instead of leaving caller forms busy", async () => {
  vi.stubGlobal("fetch", async () => {
    throw Error("offline");
  });
  const result = await api("/api/admin/ops", { method: "POST" });
  expect(result.status).toBe(0);
  expect(result.data.error).toMatch(/entries are kept/);
});
it("preserves actual server errors and successful acknowledgements", async () => {
  vi.stubGlobal(
    "fetch",
    async () => new Response('{"error":"event_conflict"}', { status: 409 }),
  );
  expect((await api("/api/admin/ops")).data.error).toBe("event_conflict");
  vi.stubGlobal(
    "fetch",
    async () => new Response('{"ok":true,"row":{"id":7}}'),
  );
  expect((await api("/api/admin/ops")).data.row.id).toBe(7);
});
