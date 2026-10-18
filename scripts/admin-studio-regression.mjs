// Fictional, intercepted UI fixtures against an isolated local Worker only.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";
const base = process.env.BASE_URL || "http://127.0.0.1:4204";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out =
  process.env.UGT_STUDIO_EVIDENCE_DIR ||
  "/workspace/artifacts/admin-studio-20261018";
await mkdir(out, { recursive: true });
const photoBytes = await readFile("public/design-assets/school.jpg");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
let checks = 0;
try {
  for (const [name, profile] of [
    ["galaxy-s24", devices["Galaxy S24"]],
    [
      "narrow-android",
      { ...devices["Galaxy S24"], viewport: { width: 320, height: 800 } },
    ],
    ["desktop", { viewport: { width: 1440, height: 1000 } }],
  ]) {
    const context = await browser.newContext({
      ...profile,
      serviceWorkers: "block",
    });
    await context.addInitScript(() =>
      localStorage.setItem("ugt-consent", "no"),
    );
    let stories = [
        {
          slug: "fixture-story",
          headline: "Fixture story",
          section: "Events",
          date: "2026-10-16",
          body: ["Original fixture article"],
          published: false,
          version: "2026-10-16 08:00:00.123456+00",
        },
      ],
      storyAck = false,
      privateAck = false,
      folderAck = false,
      photoAck = false,
      pageAck = false,
      moveFailures = 1;
    let photos = [
        {
          id: 1,
          url: "/media/gallery/fixture-one.jpg",
          caption: "First fixture photo",
          category: "Events",
          alt_text: "Fixture scene",
          published: false,
          folder_id: null,
          version: 1,
          removed_at: null,
        },
        {
          id: 2,
          url: "/media/gallery/fixture-two.jpg",
          caption: "Second fixture photo",
          category: "Events",
          alt_text: "Fixture scene",
          published: false,
          folder_id: null,
          version: 1,
          removed_at: null,
        },
      ],
      folders = [];
    const initial = {
      title: "Original fixture page",
      summary: "Original fixture introduction",
      body: ["Original fixture paragraph"],
      image: "",
      faqs: [{ question: "Fixture question?", answer: "Fixture answer." }],
    };
    const pages = {},
      history = {},
      pageWrites = [];
    let uploadedBytes = 0,
      registrations = 0,
      registrationFailure = true;
    await context.route("**/api/admin/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      if (url.pathname === "/api/admin/me")
        return route.fulfill({
          json: { ok: true, scope: "super_admin", perms: [] },
        });
      if (url.pathname === "/api/admin/gallery/upload") {
        uploadedBytes++;
        return route.fulfill({
          json: {
            url:
              "/media/gallery/" +
              url.searchParams.get("pathname").split("/").at(-1),
          },
        });
      }
      if (url.pathname === "/api/admin/gallery" && req.method() === "POST") {
        const { kind, data } = req.postDataJSON();
        assert.equal(kind, "upload");
        registrations++;
        if (registrations === 2 && registrationFailure) {
          registrationFailure = false;
          return route.fulfill({
            status: 503,
            json: { error: "fixture_registration_unavailable" },
          });
        }
        const row = {
          id: photos.length + 1,
          ...data,
          alt_text: "",
          published: false,
          folder_id: null,
          version: 1,
          removed_at: null,
        };
        photos.push(row);
        return route.fulfill({ json: { ok: true, row } });
      }
      if (url.pathname === "/api/admin/story-workspace") {
        if (req.method() === "GET")
          return route.fulfill({ json: { ok: true, drafts: [], trash: [] } });
        const body = req.postDataJSON();
        if (!privateAck) {
          privateAck = true;
          return route.fulfill({
            json: {
              ok: true,
              draft: { id: "wrong-record", revision: body.revision + 1 },
            },
          });
        }
        return route.fulfill({
          json: {
            ok: true,
            draft: { id: body.id, revision: body.revision + 1 },
          },
        });
      }
      if (url.pathname === "/api/admin/save") {
        const { kind, data } = req.postDataJSON();
        if (kind === "post") {
          if (!storyAck) {
            storyAck = true;
            return route.fulfill({ json: { ok: true } });
          }
          stories = [
            {
              ...stories[0],
              ...data,
              version: "2026-10-16 09:00:00.654321+00",
            },
          ];
          return route.fulfill({
            json: { ok: true, slug: data.slug, version: stories[0].version },
          });
        }
        return route.fulfill({ json: { ok: true, recoverable: true } });
      }
      if (url.pathname === "/api/admin/media-library") {
        if (req.method() === "GET")
          return route.fulfill({
            json: { ok: true, rows: photos, folders, canPublish: true },
          });
        const d = req.postDataJSON();
        let row;
        if (d.action === "folder.create") {
          if (!folderAck) {
            folderAck = true;
            return route.fulfill({ json: { ok: true } });
          }
          row = {
            id: "11111111-1111-4111-8111-111111111111",
            name: d.name,
            version: 1,
          };
          folders = [row];
        } else if (d.action === "folder.rename") {
          row = { id: d.id, name: d.name, version: d.version + 1 };
          folders = [row];
        } else {
          const old = photos.find((item) => item.id === d.id);
          assert.ok(old);
          if (d.action === "photo.move" && d.id === 2 && moveFailures-- > 0)
            return route.fulfill({
              status: 409,
              json: { error: "media_conflict" },
            });
          if (d.action === "photo.save" && !photoAck) {
            photoAck = true;
            return route.fulfill({ json: { ok: true, row: old } });
          }
          row = { ...old, version: old.version + 1 };
          if (d.action === "photo.save")
            Object.assign(row, {
              caption: d.caption,
              category: d.category,
              alt_text: d.altText,
            });
          if (d.action === "photo.move") row.folder_id = d.folderId;
          if (d.action === "photo.publish") row.published = true;
          if (d.action === "photo.unpublish") row.published = false;
          if (d.action === "photo.trash")
            Object.assign(row, {
              published: false,
              removed_at: "2026-10-16T10:00:00Z",
            });
          if (d.action === "photo.restore")
            Object.assign(row, { published: false, removed_at: null });
          photos = photos.map((item) => (item.id === row.id ? row : item));
        }
        return route.fulfill({ json: { ok: true, row } });
      }
      if (url.pathname === "/api/admin/website") {
        const path =
          req.method() === "GET"
            ? url.searchParams.get("path")
            : req.postDataJSON().path;
        if (!pages[path]) {
          pages[path] = {
            path,
            draft: structuredClone(initial),
            published: structuredClone(initial),
            version: 1,
          };
          history[path] = [structuredClone(pages[path])];
        }
        if (req.method() === "GET")
          return route.fulfill({
            json: {
              ok: true,
              page: pages[path],
              versions: history[path].map((item) => ({
                version: item.version,
                action: "save",
                created_at: "2026-10-16T09:00:00Z",
              })),
              canPublish: true,
            },
          });
        const d = req.postDataJSON();
        pageWrites.push(d.action);
        if (!pageAck) {
          pageAck = true;
          return route.fulfill({ json: { ok: true } });
        }
        const old = pages[path],
          draft =
            d.action === "restore"
              ? history[path].find((item) => item.version === d.sourceVersion)
                  .draft
              : d.content;
        // PostgreSQL JSONB changes key order: this must not cause a false failure.
        const jsonb = (value) =>
          value === null
            ? null
            : {
                faqs: value.faqs.map((item) => ({
                  answer: item.answer,
                  question: item.question,
                })),
                body: value.body,
                image: value.image,
                title: value.title,
                summary: value.summary,
              };
        pages[path] = {
          path,
          draft: jsonb(draft),
          published: jsonb(d.action === "publish" ? draft : old.published),
          version: old.version + 1,
        };
        history[path].push(structuredClone(pages[path]));
        return route.fulfill({ json: { ok: true, page: pages[path] } });
      }
      if (
        url.pathname === "/api/admin/ops" &&
        url.searchParams.get("view") === "products"
      )
        return route.fulfill({ json: { ok: true, rows: [] } });
      return route.fulfill({
        json: {
          ok: true,
          rows: url.searchParams.get("view") === "posts" ? stories : [],
          items: [],
          sources: [],
          period: "Today",
          generatedAt: new Date().toISOString(),
        },
      });
    });
    await context.route("**/media/gallery/**", (route) =>
      route.fulfill({ contentType: "image/jpeg", body: photoBytes }),
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => {
      errors.push({ url: page.url(), message: error.message });
      console.error("UI page error", page.url(), error.message);
    });
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(base + "/admin?tab=Content");
    await page.getByRole("button", { name: "Edit story", exact: true }).click();
    assert.equal(await page.getByRole("main").count(), 1);
    await page
      .getByRole("link", { name: "Skip to workspace", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page
        .locator("#control-room-main")
        .evaluate((node) => node === document.activeElement),
      true,
    );
    checks++;
    await page
      .getByLabel("Headline", { exact: true })
      .fill("Edited fixture headline");
    await page
      .getByRole("button", { name: "Preview story", exact: true })
      .click();
    await page
      .getByRole("article")
      .filter({ hasText: "Original fixture article" })
      .waitFor();
    checks++;
    await page
      .getByRole("alert")
      .filter({ hasText: "copy could not be confirmed saved" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Save story", exact: true })
        .isDisabled(),
      true,
    );
    checks++;
    await page
      .getByRole("button", { name: "Retry / refresh copies", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Back to editing", exact: true })
      .click();
    const saveStory = page.getByRole("button", {
      name: "Save story",
      exact: true,
    });
    await saveStory.waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (button) => button.textContent === "Save story" && !button.disabled,
      ),
    );
    await saveStory.click();
    await page
      .getByRole("alert")
      .filter({ hasText: "The story was not saved" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Headline", { exact: true }).inputValue(),
      "Edited fixture headline",
    );
    checks++;
    await saveStory.click();
    await page
      .getByRole("button", { name: "Edit story", exact: true })
      .waitFor();
    assert.equal(stories[0].headline, "Edited fixture headline");
    checks++;
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: out + "/" + name + "-stories.png",
      fullPage: false,
    });
    await page.goto(base + "/admin?tab=Gallery");
    await page
      .getByRole("button", { name: "＋ Upload photos", exact: true })
      .click();
    await page
      .getByLabel("Choose gallery photos", { exact: true })
      .setInputFiles([
        {
          name: "fixture-one-upload.jpg",
          mimeType: "image/jpeg",
          buffer: photoBytes,
        },
        {
          name: "fixture-two-upload.jpg",
          mimeType: "image/jpeg",
          buffer: photoBytes,
        },
      ]);
    const uploadProgress = page.getByRole("region", {
      name: "Photo upload progress",
    });
    await uploadProgress
      .getByText(
        "fixture-two-upload.jpg — This photo did not finish. Retry when you are ready.",
        { exact: true },
      )
      .waitFor();
    assert.equal(uploadedBytes, 2);
    assert.equal(photos.length, 3);
    checks++;
    await uploadProgress
      .getByRole("button", { name: "Retry unfinished photos", exact: true })
      .click();
    await uploadProgress
      .getByText("fixture-two-upload.jpg — Saved privately", { exact: true })
      .waitFor();
    assert.equal(uploadedBytes, 2);
    assert.equal(photos.length, 4);
    assert.equal(photos[3].published, false);
    checks++;
    await page
      .getByRole("button", { name: "＋ Upload photos", exact: true })
      .click();
    await page.getByText("Organise folders", { exact: true }).click();
    await page
      .getByLabel("New folder name", { exact: true })
      .fill("Fixture folder");
    await page
      .getByRole("button", { name: "Save folder", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "change could not be confirmed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("New folder name", { exact: true }).inputValue(),
      "Fixture folder",
    );
    checks++;
    await page
      .getByRole("button", { name: "Save folder", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Folder saved" })
      .waitFor();
    await page
      .getByLabel("Select First fixture photo", { exact: true })
      .check();
    await page
      .getByLabel("Select Second fixture photo", { exact: true })
      .check();
    await page
      .getByRole("combobox", { name: /^Move to folder/ })
      .selectOption(folders[0].id);
    await page
      .getByRole("button", { name: "Move selected", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "1 photos updated." })
      .waitFor();
    assert.equal(photos[0].folder_id, folders[0].id);
    assert.equal(photos[1].folder_id, null);
    assert.equal(
      await page
        .getByLabel("Select Second fixture photo", { exact: true })
        .isChecked(),
      true,
    );
    checks++;
    await page
      .getByRole("button", { name: "Move selected", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "1 photos updated." })
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector('[aria-label="Selected photos"]'),
    );
    assert.equal(photos[1].folder_id, folders[0].id);
    checks++;
    const first = page
      .getByRole("article")
      .filter({ has: page.getByText("First fixture photo", { exact: true }) });
    await first
      .getByRole("button", { name: "Edit photo", exact: true })
      .click();
    await page
      .getByLabel("Caption", { exact: true })
      .fill("Edited fixture caption");
    await page
      .getByRole("button", { name: "Save photo details", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "change could not be confirmed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Caption", { exact: true }).inputValue(),
      "Edited fixture caption",
    );
    checks++;
    await page
      .getByRole("button", { name: "Save photo details", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Photo saved." })
      .waitFor();
    await page
      .getByRole("button", { name: "Publish photo", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Photo published." })
      .waitFor();
    assert.equal(photos[0].published, true);
    checks++;
    await page
      .getByRole("button", { name: "Close photo", exact: true })
      .click();
    await page
      .getByLabel("Select Edited fixture caption", { exact: true })
      .check();
    await page
      .getByRole("button", { name: "Move selected to removed", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "1 photos updated." })
      .waitFor();
    assert.equal(photos[0].published, false);
    assert.ok(photos[0].removed_at);
    assert.equal(photos.length, 4);
    checks++;
    await page.getByRole("combobox", { name: /^Show/ }).selectOption("removed");
    await page.getByRole("button", { name: "Edit photo", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore privately", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Restored privately" })
      .waitFor();
    assert.equal(photos[0].published, false);
    assert.equal(photos[0].removed_at, null);
    checks++;
    await page
      .getByRole("button", { name: "Close photo", exact: true })
      .click();
    await page.getByRole("combobox", { name: /^Show/ }).selectOption("all");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: out + "/" + name + "-media.png",
      fullPage: false,
    });
    checks++;
    await page.goto(base + "/admin?tab=Website");
    await page
      .getByRole("combobox", { name: /^Choose a page/ })
      .selectOption("/about");
    await page
      .getByLabel("Page title", { exact: true })
      .fill("New fixture About heading");
    await page
      .getByRole("button", { name: "Save private draft", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "save could not be confirmed" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Page title", { exact: true }).inputValue(),
      "New fixture About heading",
    );
    checks++;
    await page
      .getByRole("button", { name: "Save private draft", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Draft saved." })
      .waitFor();
    assert.equal(pages["/about"].published.title, initial.title);
    checks++;
    await page
      .getByRole("button", { name: "Preview content", exact: true })
      .click();
    await page
      .getByRole("article")
      .getByRole("heading", { name: "New fixture About heading", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Back to editing", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish page", exact: true })
      .click();
    assert.equal(pageWrites.includes("publish"), false);
    await page
      .getByRole("button", { name: "Confirm publication", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Page published." })
      .waitFor();
    assert.equal(pages["/about"].published.title, "New fixture About heading");
    checks++;
    await page.getByText("Earlier versions", { exact: true }).click();
    await page
      .getByRole("combobox", { name: /^Restore to draft/ })
      .selectOption("1");
    await page
      .getByRole("button", { name: "Restore as a private draft", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Earlier content restored" })
      .waitFor();
    assert.equal(
      await page.getByLabel("Page title", { exact: true }).inputValue(),
      initial.title,
    );
    assert.equal(pages["/about"].published.title, "New fixture About heading");
    checks++;
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: out + "/" + name + "-website.png",
      fullPage: false,
    });
    checks++;
    await context.close();
    console.log(
      "PASS",
      name,
      "stories, explicit save acknowledgements, media folders/partial bulk/recovery and website draft/publish/history",
    );
  }
  console.log(JSON.stringify({ checks, localFixtures: true, out }));
} finally {
  await browser.close();
}
