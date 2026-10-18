// Local, disposable PostgreSQL only. No remote credentials or database URLs.
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const adapter = vi.hoisted(() => ({
  q: vi.fn(),
  schema: vi.fn(),
  owner: true,
}));
vi.mock("@/lib/server/db", () => ({
  q: adapter.q,
  qSchema: adapter.schema,
  hasDb: () => true,
}));
vi.mock("@/lib/server/ops", () => ({ ensureOpsSchema: async () => {} }));
vi.mock("@/lib/server/session", () => ({
  verifyAdminSession: async () => true,
  hasPerm: () => true,
  isSuperAdmin: () => adapter.owner,
  adminActor: () => "local-fixture",
}));
vi.mock("@/lib/server/origin", () => ({ requireOrigin: () => true }));
vi.mock("@/lib/server/ratelimit", () => ({
  rateLimit: () => true,
  clientIp: () => "fixture",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
import { POST as websitePost } from "@/app/api/admin/website/route";
import {
  POST as mediaPost,
  GET as mediaGet,
} from "@/app/api/admin/media-library/route";
import { POST as legacyMediaPost } from "@/app/api/admin/gallery/route";
import { confirmedWebsitePage } from "@/lib/client/website-ack";
import { MEDIA_LIBRARY_SCHEMA } from "@/lib/server/media-library";
import {
  WEBSITE_CONTENT_SCHEMA,
  readWebsiteContent,
} from "@/lib/server/website-content";
import { WEBSITE_DEFAULTS } from "@/lib/website-content";
const enabled = process.env.UGT_STUDIO_PG_FIXTURE === "1",
  container = "ugt-studio-fixture-20261016";
const env = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete env[key];
const docker = (args: string[], input?: string) =>
  execFileSync("docker", ["--host=unix:///var/run/docker.sock", ...args], {
    env,
    input,
    encoding: "utf8",
    timeout: 15000,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
const sql = (input: string) =>
  docker(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-U",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    "SET statement_timeout='5s';\n" + input,
  );
const literal = (value: unknown) =>
  value == null
    ? "NULL"
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "'" + String(value).replaceAll("'", "''") + "'";
function query(statement: string, args: unknown[] = []) {
  let result: string;
  const text = statement.trim();
  if (text.startsWith("WITH saved AS"))
    result = text.includes("SELECT result.path")
      ? text.replace(
          "SELECT result.path,result.draft,result.published,result.version FROM result JOIN history USING(path,version)",
          "SELECT coalesce(json_agg(result),'[]') FROM result JOIN history USING(path,version)",
        )
      : text.replace(
          "SELECT * FROM saved",
          "SELECT coalesce(json_agg(saved),'[]') FROM saved",
        );
  else if (/^(INSERT|UPDATE)/.test(text))
    result = `WITH result AS (${text}) SELECT coalesce(json_agg(result),'[]') FROM result`;
  else result = `SELECT coalesce(json_agg(result),'[]') FROM (${text}) result`;
  return JSON.parse(
    sql(
      `SET standard_conforming_strings=on; PREPARE fixture AS ${result}; EXECUTE fixture${args.length ? "(" + args.map(literal).join(",") + ")" : ""};`,
    ),
  );
}
let created = false;
beforeAll(async () => {
  if (!enabled) return;
  docker([
    "run",
    "--rm",
    "-d",
    "--network",
    "none",
    "--name",
    container,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:16-alpine",
  ]);
  created = true;
  expect(
    docker(["inspect", container, "--format", "{{.HostConfig.NetworkMode}}"]),
  ).toBe("none");
  await vi.waitFor(
    () =>
      expect(
        docker([
          "exec",
          container,
          "pg_isready",
          "-h",
          "127.0.0.1",
          "-U",
          "postgres",
        ]),
      ).toContain("accepting connections"),
    { timeout: 10000 },
  );
  const source = readFileSync(
    new URL("../lib/server/ops.ts", import.meta.url),
    "utf8",
  );
  const gallery = source.slice(
    source.indexOf("CREATE TABLE IF NOT EXISTS gallery_photos ("),
    source.indexOf("-- Indexes for the ops suite"),
  );
  sql(
    "CREATE TABLE audit_log(id SERIAL PRIMARY KEY,actor TEXT,action TEXT,detail JSONB);\n" +
      gallery,
  );
  sql(
    "INSERT INTO gallery_photos(url,caption,category,alt_text,published) VALUES('/media/gallery/local-fixture.png','Original caption','School','Visible scene',true);",
  );
  adapter.q.mockImplementation(
    async (statement: string, args: unknown[] = []) => query(statement, args),
  );
  adapter.schema.mockImplementation(async (statement: string) => {
    sql(statement);
  });
}, 20000);
afterAll(() => {
  if (created) docker(["stop", container]);
}, 20000);
const call = async (
  post: (req: Request) => Promise<Response>,
  body: unknown,
) => {
  const response = await post(
    new Request("https://urbangangtour.co.ke/api/admin/test", {
      method: "POST",
      headers: {
        origin: "https://urbangangtour.co.ke",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
};
it.skipIf(!enabled)(
  "persists website drafts/history and recoverable media using the actual route SQL",
  async () => {
    const draft = {
      ...WEBSITE_DEFAULTS["/about"],
      title: "Team's fixture title",
    };
    expect(
      (
        await call(websitePost, {
          action: "save",
          path: "/about",
          version: 0,
          content: draft,
        })
      ).status,
    ).toBe(200);
    expect(await readWebsiteContent("/about")).toBeNull();
    const published = await call(websitePost, {
      action: "publish",
      path: "/about",
      version: 1,
      content: draft,
    });
    expect(published.status).toBe(200);
    expect(published.body.page.version).toBe(2);
    expect((await readWebsiteContent("/about"))?.title).toBe(draft.title);
    expect(
      confirmedWebsitePage(published.body.page, {
        path: "/about",
        version: 1,
        action: "publish",
        content: draft,
      }).published,
    ).toEqual(draft);
    expect(
      (
        await call(websitePost, {
          action: "save",
          path: "/about",
          version: 1,
          content: draft,
        })
      ).status,
    ).toBe(409);
    const edited = { ...draft, title: "Private next version" };
    expect(
      (
        await call(websitePost, {
          action: "save",
          path: "/about",
          version: 2,
          content: edited,
        })
      ).status,
    ).toBe(200);
    expect(
      query(
        "SELECT published->>'title' AS title FROM website_pages WHERE path='/about'",
      )[0].title,
    ).toBe(draft.title);
    const restored = await call(websitePost, {
      action: "restore",
      path: "/about",
      version: 3,
      sourceVersion: 1,
    });
    expect(restored.status).toBe(200);
    expect(restored.body.page.published.title).toBe(draft.title);
    expect(
      query("SELECT version FROM website_page_versions ORDER BY version"),
    ).toHaveLength(4);
    sql(WEBSITE_CONTENT_SCHEMA);
    const folder = await call(mediaPost, {
      action: "folder.create",
      name: "Tour's folder",
    });
    expect(folder.status).toBe(200);
    const folderId = folder.body.row.id;
    expect(
      (
        await call(mediaPost, {
          action: "folder.create",
          name: "TOUR'S FOLDER",
        })
      ).status,
    ).toBe(409);
    sql(MEDIA_LIBRARY_SCHEMA);
    adapter.owner = false;
    expect(
      (
        await call(mediaPost, {
          action: "photo.save",
          id: 1,
          version: 1,
          caption: "Crew edit",
          category: "School",
          altText: "Scene",
        })
      ).status,
    ).toBe(409);
    adapter.owner = true;
    const moved = await call(mediaPost, {
      action: "photo.move",
      id: 1,
      version: 1,
      folderId,
    });
    expect(moved.status).toBe(200);
    expect(moved.body.row.published).toBe(true);
    expect(moved.body.row.folder_id).toBe(folderId);
    const removed = await call(mediaPost, {
      action: "photo.trash",
      id: 1,
      version: 2,
    });
    expect(removed.status).toBe(200);
    expect(removed.body.row).toMatchObject({
      published: false,
      caption: "Original caption",
      version: 3,
    });
    expect(removed.body.row.removed_at).toBeTruthy();
    expect(
      (await call(mediaPost, { action: "photo.publish", id: 1, version: 3 }))
        .status,
    ).toBe(409);
    const photo = await call(mediaPost, {
      action: "photo.restore",
      id: 1,
      version: 3,
    });
    expect(photo.status).toBe(200);
    expect(photo.body.row).toMatchObject({
      published: false,
      removed_at: null,
      caption: "Original caption",
      version: 4,
    });
    expect(
      (await call(mediaPost, { action: "photo.publish", id: 1, version: 4 }))
        .status,
    ).toBe(200);
    expect(
      (
        await call(mediaPost, {
          action: "photo.save",
          id: 1,
          version: 4,
          caption: "Stale edit",
          category: "School",
          altText: "Scene",
        })
      ).status,
    ).toBe(409);
    expect(
      query("SELECT caption,url,version FROM gallery_photos WHERE id=1"),
    ).toEqual([
      {
        caption: "Original caption",
        url: "/media/gallery/local-fixture.png",
        version: 5,
      },
    ]);
    expect(query("SELECT id FROM audit_log")).toHaveLength(9);
    // The compatibility endpoint shares the same writer; old tabs cannot evade CAS.
    expect(
      (
        await call(legacyMediaPost, {
          kind: "update",
          data: { id: 1, caption: "Blind overwrite" },
        })
      ).status,
    ).toBe(409);
    const legacy = await call(legacyMediaPost, {
      kind: "update",
      data: {
        id: 1,
        version: 5,
        caption: "Reviewed metadata",
        category: "School",
        altText: "Visible scene",
      },
    });
    expect(legacy.status).toBe(200);
    expect(legacy.body.row.version).toBe(6);
    expect(
      (
        await call(mediaPost, {
          action: "photo.save",
          id: 1,
          version: 5,
          caption: "New stale overwrite",
          category: "School",
          altText: "Scene",
        })
      ).status,
    ).toBe(409);
    sql(
      "INSERT INTO gallery_photos(url,caption,category,alt_text) VALUES('/media/gallery/legacy-null.png',NULL,NULL,NULL)",
    );
    const library = await (
      await mediaGet(
        new Request("https://urbangangtour.co.ke/api/admin/media-library"),
      )
    ).json();
    expect(
      library.rows.find(
        (row: { url: string }) => row.url === "/media/gallery/legacy-null.png",
      ),
    ).toMatchObject({ caption: "", category: "", alt_text: "", version: 1 });
    const normalized = await call(mediaPost, {
      action: "photo.move",
      id: 2,
      version: 1,
      folderId: null,
    });
    expect(normalized.body.row).toMatchObject({
      caption: "",
      category: "",
      alt_text: "",
      version: 2,
    });
  },
  30000,
);
