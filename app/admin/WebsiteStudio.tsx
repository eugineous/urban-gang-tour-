"use client";
import { useEffect, useRef, useState } from "react";
import {
  EDITABLE_PAGES,
  websiteContent,
  type WebsiteContent,
} from "@/lib/website-content";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import { confirmedWebsitePage } from "@/lib/client/website-ack";
import { useUnsavedWarning } from "@/lib/client/use-unsaved-warning";
import ImageUploadField from "./ImageUploadField";
type Page = {
  path: string;
  draft: WebsiteContent;
  published: WebsiteContent | null;
  version: number;
};
type Revision = { version: number; action: string; created_at: string };
export default function WebsiteStudio() {
  const [path, setPath] = useState("/"),
    [page, setPage] = useState<Page | null>(null),
    [content, setContent] = useState<WebsiteContent | null>(null),
    [versions, setVersions] = useState<Revision[]>([]),
    [source, setSource] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [imageBusy, setImageBusy] = useState(false),
    [owner, setOwner] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState(false),
    [confirmPublish, setConfirmPublish] = useState(false),
    [reload, setReload] = useState(0);
  const pending = useRef(false);
  const dirty =
    !!page &&
    !!content &&
    JSON.stringify(content) !== JSON.stringify(page.draft);
  useUnsavedWarning(dirty || busy);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setNotice("");
    setPage(null);
    setContent(null);
    setConfirmPublish(false);
    void (async () => {
      try {
        const response = await fetchWithTimeout(
          "/api/admin/website?path=" + encodeURIComponent(path),
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (
          !response.ok ||
          !data.ok ||
          data.page?.path !== path ||
          !Number.isInteger(data.page.version)
        )
          throw Error();
        const draft = websiteContent(data.page.draft);
        if (!controller.signal.aborted) {
          setPage({ ...data.page, draft });
          setContent(draft);
          setVersions(Array.isArray(data.versions) ? data.versions : []);
          setOwner(data.canPublish === true);
        }
      } catch {
        if (!controller.signal.aborted)
          setError(
            "This page could not be loaded. Nothing has been changed. Try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [path, reload]);
  async function save(action: "save" | "publish" | "restore") {
    if (pending.current || !page || !content) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const validated = websiteContent(content);
      const response = await fetchWithTimeout(
        "/api/admin/website",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            path,
            version: page.version,
            ...(action === "restore"
              ? { sourceVersion: Number(source) }
              : { content: validated }),
          }),
        },
        20000,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw Error(data.error || "not_confirmed");
      const next = confirmedWebsitePage(data.page, {
        path,
        version: page.version,
        action,
        content: validated,
      });
      setPage(next);
      setContent(next.draft);
      setVersions((current) => [
        { version: next.version, action, created_at: new Date().toISOString() },
        ...current,
      ]);
      setConfirmPublish(false);
      setNotice(
        action === "publish"
          ? "Page published."
          : action === "restore"
            ? "Earlier content restored to the draft only. Review before publishing."
            : "Draft saved. The public page is unchanged.",
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setError(
        code === "website_conflict"
          ? "Another editor saved a newer version. Your text is kept. Compare the saved page in another tab before retrying."
          : code === "missing_title"
            ? "Add a page title. Your other entries are kept."
            : code === "incomplete_faq"
              ? "Complete every question and answer, or remove the unfinished item."
              : code === "owner_review_required"
                ? "Only the owner can publish. Save a draft for review."
                : "The save could not be confirmed. Your entries are kept. Check the saved page before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const set = (key: keyof WebsiteContent, value: unknown) => {
    setContent((current) => (current ? { ...current, [key]: value } : current));
    setConfirmPublish(false);
  };
  return (
    <section className="cr-panel" aria-label="Website editor">
      <div className="cr-toolbar">
        <div>
          <h2>Website pages</h2>
          <p className="cr-muted">Edit content without changing code.</p>
        </div>
        {page && (
          <a
            className="cr-secondary"
            href={path}
            target="_blank"
            rel="noreferrer"
          >
            View public page ↗
          </a>
        )}
      </div>
      <label className="cr-field">
        Choose a page
        <select
          value={path}
          disabled={busy || imageBusy}
          onChange={(event) => {
            if (!dirty || confirm("Switch pages without saving this draft?")) {
              setPath(event.target.value);
              setPreview(false);
            }
          }}
        >
          {EDITABLE_PAGES.map((item) => (
            <option key={item.path} value={item.path}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="cr-notice error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="cr-notice success">
          {notice}
        </p>
      )}
      {loading && <p role="status">Loading page content…</p>}
      {!loading && !page && (
        <button
          className="cr-secondary"
          onClick={() => setReload((value) => value + 1)}
        >
          Try loading again
        </button>
      )}
      {page && content && (
        <>
          <div className="cr-toolbar" style={{ marginTop: 24 }}>
            <p className="cr-muted" role="status">
              {dirty
                ? "Unsaved changes"
                : `Saved draft · version ${page.version}`}
              {page.published
                ? " · Public version exists"
                : " · Original public page is unchanged"}
            </p>
            <button
              className="cr-secondary"
              onClick={() => setPreview((value) => !value)}
            >
              {preview ? "Back to editing" : "Preview content"}
            </button>
          </div>
          {preview ? (
            <article className="cr-story-preview">
              <h2>{content.title}</h2>
              <p>{content.summary}</p>
              {content.image && (
                <img src={content.image} alt="Page image preview" />
              )}
              {content.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {content.faqs.map((faq, index) => (
                <section key={index}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </section>
              ))}
              <p className="cr-muted">
                Content preview only. The public page changes after publication.
              </p>
            </article>
          ) : (
            <fieldset className="cr-fieldset" disabled={busy}>
              <label className="cr-field">
                Page title
                <input
                  maxLength={120}
                  value={content.title}
                  onChange={(event) => set("title", event.target.value)}
                />
              </label>
              <label className="cr-field">
                Short introduction
                <textarea
                  rows={3}
                  maxLength={500}
                  value={content.summary}
                  onChange={(event) => set("summary", event.target.value)}
                />
              </label>
              {path !== "/" && path !== "/faq" && (
                <label className="cr-field">
                  Our story
                  <textarea
                    rows={10}
                    value={content.body.join("\n\n")}
                    onChange={(event) =>
                      set("body", event.target.value.split(/\n\s*\n/))
                    }
                  />
                </label>
              )}
              {path !== "/faq" && (
                <ImageUploadField
                  label="Page image"
                  value={content.image}
                  purpose="stories"
                  disabled={busy}
                  onChange={(url) => set("image", url)}
                  onBusyChange={setImageBusy}
                />
              )}{" "}
              {path === "/faq" && (
                <section
                  className="cr-fieldset"
                  aria-label="Questions and answers"
                >
                  {content.faqs.map((faq, index) => (
                    <fieldset className="cr-panel cr-fieldset" key={index}>
                      <legend>Question {index + 1}</legend>
                      <label className="cr-field">
                        Question
                        <input
                          maxLength={300}
                          value={faq.question}
                          onChange={(event) =>
                            set(
                              "faqs",
                              content.faqs.map((item, i) =>
                                i === index
                                  ? { ...item, question: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="cr-field">
                        Answer
                        <textarea
                          rows={3}
                          maxLength={3000}
                          value={faq.answer}
                          onChange={(event) =>
                            set(
                              "faqs",
                              content.faqs.map((item, i) =>
                                i === index
                                  ? { ...item, answer: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        className="cr-text-link danger"
                        onClick={() =>
                          set(
                            "faqs",
                            content.faqs.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove question {index + 1}
                      </button>
                    </fieldset>
                  ))}
                  <button
                    className="cr-secondary"
                    disabled={content.faqs.length >= 30}
                    onClick={() =>
                      set("faqs", [
                        ...content.faqs,
                        { question: "", answer: "" },
                      ])
                    }
                  >
                    Add a question
                  </button>
                </section>
              )}
            </fieldset>
          )}
          <footer className="cr-savebar">
            <div className="cr-actions">
              <button
                className="cr-primary"
                disabled={busy || imageBusy}
                onClick={() => void save("save")}
              >
                {busy ? "Saving…" : "Save private draft"}
              </button>
              {owner && (
                <button
                  className="cr-secondary"
                  disabled={busy || imageBusy}
                  onClick={() => setConfirmPublish(true)}
                >
                  Publish page
                </button>
              )}
            </div>
            {confirmPublish && (
              <div className="cr-notice">
                <p>
                  Publish this content to {path}? Existing content stays in
                  version history.
                </p>
                <div className="cr-actions">
                  <button
                    className="cr-primary"
                    disabled={busy || imageBusy}
                    onClick={() => void save("publish")}
                  >
                    Confirm publication
                  </button>
                  <button
                    className="cr-secondary"
                    disabled={busy}
                    onClick={() => setConfirmPublish(false)}
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            )}
          </footer>
          {!!versions.length && (
            <details className="cr-disclosure">
              <summary>Earlier versions</summary>
              <label className="cr-field">
                Restore to draft
                <select
                  value={source}
                  disabled={busy}
                  onChange={(event) => setSource(event.target.value)}
                >
                  <option value="">Choose an earlier version</option>
                  {versions
                    .filter((item) => item.version !== page.version)
                    .map((item) => (
                      <option key={item.version} value={item.version}>
                        Version {item.version} · {item.action}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="cr-secondary"
                disabled={busy || !source}
                onClick={() => {
                  if (
                    !dirty ||
                    confirm(
                      "Replace the current unsaved draft with this earlier version?",
                    )
                  )
                    void save("restore");
                }}
              >
                Restore as a private draft
              </button>
            </details>
          )}
        </>
      )}
    </section>
  );
}
