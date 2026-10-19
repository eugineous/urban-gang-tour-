"use client";
import { useMemo, useState } from "react";
import ImageUploadField from "./ImageUploadField";
import { PARTNER_EVENT_DRAFTS } from "@/lib/partner-event-drafts";
import { storyDraftContent } from "@/lib/story-draft";
import {chronological,type Chronology} from '@/lib/chronology';
import EditorialCalendar from './EditorialCalendar';

type Story = Record<string, any>;
type Props = {
  rows: Story[];
  editPost: Story | null;
  setEditPost: (value: any) => void;
  onSave: (story: Story) => void;
  onDelete: (slug: string, version: string) => void;
  canPublish: boolean;
  saving: boolean;
  saveError: string;
  draftReady: boolean;
  loading?: boolean;
  loadError?: string;
  onReload?: () => void;
};
function state(story: Story) {
  if (story.editorial_status === "in_review") return "Review";
  if (!story.published) return "Draft";
  return String(story.date).slice(0, 10) >
    new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" })
    ? "Scheduled"
    : "Published";
}
/** Existing story contracts and private recovery remain authoritative. */
export default function StoryDesk({
  rows,
  editPost,
  setEditPost,
  onSave,
  onDelete,
  canPublish,
  saving,
  saveError,
  draftReady,
  loading,
  loadError,
  onReload,
}: Props) {
  const [imageBusy, setImageBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [preview, setPreview] = useState(false),
    [paste, setPaste] = useState(""),
    [pasteError, setPasteError] = useState("");
  const [sort,setSort]=useState<Chronology>('newest');
  const visible = useMemo(
    () =>
      chronological(rows.filter(
        (row) =>
          (filter === "All" || state(row) === filter) &&
          [row.headline, row.section, row.slug]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),sort,row=>row.date,row=>String(row.headline||''),row=>String(row.slug||'')),
    [rows, query, filter,sort],
  );
  const create = () => {
    setPreview(false);
    setEditPost({ published: false });
  };
  function usePaste() {
    try {
      const raw = paste
        .trim()
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```$/, "");
      if (!raw || raw.length > 100000) throw Error();
      let next: Story;
      if (raw.startsWith("{")) {
        const source = JSON.parse(raw);
        if (
          !source ||
          Array.isArray(source) ||
          typeof source.headline !== "string" ||
          (!Array.isArray(source.body) && typeof source.body !== "string")
        )
          throw Error();
        next = {
          headline: source.headline,
          body: source.body,
          dek: typeof source.dek === "string" ? source.dek : "",
          section: typeof source.section === "string" ? source.section : "News",
        };
      } else {
        const [first, ...lines] = raw.split("\n");
        next = {
          headline: first.replace(/^#+\s*/, ""),
          body: lines.join("\n").trim(),
          section: "News",
        };
      }
      if (!next.headline.trim() || next.headline.length > 500) throw Error();
      setEditPost(storyDraftContent({ ...next, published: false }));
      setPreview(false);
      setPasteError("");
      setPaste("");
    } catch {
      setPasteError(
        "Paste a headline followed by the story, or JSON with headline and body. Nothing has been saved or published.",
      );
    }
  }
  if (editPost) {
    const p = editPost;
    const set = (key: string, value: unknown) =>
      setEditPost((current: Story | null) =>
        current ? { ...current, [key]: value } : current,
      );
    const paragraphs = Array.isArray(p.body)
      ? p.body
      : String(p.body || "").split(/\n\s*\n/);
    return (
      <section className="cr-panel cr-story-editor" aria-label="Story editor">
        <div className="cr-toolbar">
          <div>
            <p className="cr-eyebrow">{p.slug ? "Edit story" : "New story"}</p>
            <h2>{p.headline || "Your next story"}</h2>
          </div>
          <button
            type="button"
            className="cr-secondary"
            aria-pressed={preview}
            disabled={saving}
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? "Back to editing" : "Preview story"}
          </button>
        </div>
        {saveError && (
          <p role="alert" className="cr-notice error">
            {saveError}
          </p>
        )}
        {preview ? (
          <article className="cr-story-preview">
            <p>
              {p.section || "News"} · {p.date || "Date assigned when saved"}
            </p>
            <h2>{p.headline || "Untitled story"}</h2>
            {p.dek && <p>{p.dek}</p>}
            {p.image && <img src={p.image} alt="Story cover preview" />}
            {paragraphs
              .filter(Boolean)
              .map((paragraph: string, index: number) => (
                <p key={index}>{paragraph}</p>
              ))}
            <p className="cr-muted">
              Preview only — this does not publish the story.
            </p>
          </article>
        ) : (
          <fieldset disabled={saving} className="cr-fieldset">
            <label className="cr-field">
              Headline
              <input
                value={p.headline || ""}
                maxLength={500}
                placeholder="Headline *"
                onChange={(event) => set("headline", event.target.value)}
              />
            </label>
            <label className="cr-field">
              Short summary
              <input
                value={p.dek || ""}
                maxLength={2000}
                placeholder="One sentence for the story card"
                onChange={(event) => set("dek", event.target.value)}
              />
            </label>
            <label className="cr-field">
              Story
              <textarea
                value={
                  Array.isArray(p.body) ? p.body.join("\n\n") : p.body || ""
                }
                maxLength={100000}
                rows={14}
                placeholder="Full article. Separate paragraphs with a blank line."
                onChange={(event) => set("body", event.target.value)}
              />
            </label>
            <div className="cr-form-grid">
              <label className="cr-field">
                Section
                <input
                  value={p.section || ""}
                  maxLength={100}
                  placeholder="Events, tour recaps or a new section"
                  list="story-sections"
                  onChange={(event) => set("section", event.target.value)}
                />
                <datalist id="story-sections">
                  {[
                    ...new Set(rows.map((row) => row.section).filter(Boolean)),
                  ].map((section) => (
                    <option key={section} value={section} />
                  ))}
                </datalist>
              </label>
              <label className="cr-field">
                Publication date
                <input
                  type="date"
                  value={String(p.date || "").slice(0, 10)}
                  onChange={(event) => set("date", event.target.value)}
                />
                <span className="cr-muted">
                  A future date schedules a published story.
                </span>
              </label>
            </div>
            <ImageUploadField
              label="Story cover image"
              value={p.image || ""}
              purpose="stories"
              disabled={saving}
              onChange={(url) => set("image", url)}
              onBusyChange={setImageBusy}
            />
            {canPublish ? (
              <label className="cr-check">
                <input
                  type="checkbox"
                  checked={p.published === true}
                  onChange={(event) => set("published", event.target.checked)}
                />
                Published (visible on the site + sitemap)
              </label>
            ) : (
              <p className="cr-notice">
                Your draft stays private. Send it for the owner’s review when
                ready.
              </p>
            )}
          </fieldset>
        )}
        <footer className="cr-savebar">
          <p role="status">
            {saving
              ? "Saving story…"
              : imageBusy
                ? "Uploading cover…"
                : !draftReady
                  ? "Saving your private recovery copy…"
                  : "Private recovery copy saved. Save story to apply these changes."}
          </p>
          <div className="cr-actions">
            {canPublish ? (
              <button
                className="cr-primary"
                disabled={saving || imageBusy || !draftReady}
                onClick={() => onSave(p)}
              >
                {saving ? "Saving…" : "Save story"}
              </button>
            ) : (
              <>
                <button
                  className="cr-primary"
                  disabled={saving || imageBusy || !draftReady}
                  onClick={() =>
                    onSave({ ...p, published: false, submitForReview: false })
                  }
                >
                  Save draft
                </button>
                <button
                  className="cr-secondary"
                  disabled={saving || imageBusy || !draftReady}
                  onClick={() =>
                    onSave({ ...p, published: false, submitForReview: true })
                  }
                >
                  Send for review
                </button>
              </>
            )}
            <button
              className="cr-secondary"
              disabled={saving || imageBusy}
              onClick={() => {
                if (
                  draftReady ||
                  confirm(
                    "Your latest changes are not confirmed saved. Close anyway? Cancel to keep writing.",
                  )
                )
                  setEditPost(null);
              }}
            >
              Close editor
            </button>
          </div>
        </footer>
      </section>
    );
  }
  return (
    <section className="cr-panel" aria-label="Stories desk">
      <EditorialCalendar canPublish={canPublish}/>
      <div className="cr-toolbar">
        <div>
          <h2>Your stories</h2>
          <p className="cr-muted">Write, review and publish.</p>
        </div>
        <button className="cr-primary" onClick={create}>
          ＋ New post
        </button>
      </div>
      {saveError && (
        <p role="alert" className="cr-notice error">
          {saveError}
        </p>
      )}
      {loadError && (
        <div role="alert" className="cr-notice error">
          {loadError}
          <button className="cr-secondary" onClick={onReload}>
            Try again
          </button>
        </div>
      )}
      <div className="cr-filter-row">
        <label className="cr-field">Order<select value={sort} onChange={event=>setSort(event.target.value as Chronology)}><option value="newest">Newest story date</option><option value="oldest">Oldest story date</option><option value="title">Headline A–Z</option></select></label>
        <label className="cr-field">
          Find a story
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Headline or section"
          />
        </label>
        <label className="cr-field">
          Show
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {["All", "Draft", "Review", "Scheduled", "Published"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <details className="cr-disclosure">
        <summary>Paste a story</summary>
        <label className="cr-field">
          Headline first, then your article
          <textarea
            value={paste}
            onChange={(event) => {
              setPaste(event.target.value);
              setPasteError("");
            }}
            rows={6}
            maxLength={100000}
          />
        </label>
        {pasteError && <p role="alert">{pasteError}</p>}
        <button
          className="cr-secondary"
          disabled={!paste.trim()}
          onClick={usePaste}
        >
          Use as a private draft
        </button>
      </details>
      <details className="cr-disclosure">
        <summary>Supplied partner-event news drafts</summary>
        <p className="cr-muted">
          Start privately. Check the facts before publication.
        </p>
        <div className="cr-actions">
          {PARTNER_EVENT_DRAFTS.map((draft) => (
            <button
              className="cr-secondary"
              key={draft.key}
              disabled={rows.some((row) => row.slug === draft.key)}
              onClick={() =>
                setEditPost({
                  published: false,
                  slug: draft.key,
                  headline: draft.news.headline,
                  dek: draft.news.dek,
                  body: draft.news.body,
                  section: "Events",
                  image: "",
                })
              }
            >
              {draft.name}
            </button>
          ))}
        </div>
      </details>
      {loading ? (
        <p role="status">Loading stories…</p>
      ) : (
        <>
          <p className="cr-muted" role="status">
            {visible.length} {visible.length === 1 ? "story" : "stories"}
          </p>
          <div className="cr-record-grid">
            {visible.map((row) => (
              <article className="cr-story-card" key={row.slug}>
                {row.image && <img src={row.image} alt="" loading="lazy" />}
                <div className="cr-card-body">
                  <div className="cr-actions">
                    <span className="cr-badge" data-state={state(row)}>
                      {state(row)}
                    </span>
                    <span className="cr-muted">{row.section || "News"}</span>
                  </div>
                  <h3>{row.headline}</h3>
                  <p className="cr-muted">
                    {String(row.date || "").slice(0, 10)}
                  </p>
                  <div className="cr-actions">
                    <button
                      className="cr-secondary"
                      disabled={saving || (!canPublish && row.published)}
                      onClick={() => {
                        setPreview(false);
                        setEditPost(row);
                      }}
                    >
                      Edit story
                    </button>
                    {state(row) === "Published" && (
                      <a
                        className="cr-text-link"
                        href={"/blog/" + row.slug}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View story ↗
                      </a>
                    )}
                    <button
                      className="cr-text-link danger"
                      disabled={saving || (!canPublish && row.published)}
                      onClick={() => onDelete(row.slug, row.version)}
                    >
                      Move to removed
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && !loadError && (
            <div className="cr-empty">
              <h3>
                {rows.length ? "No matching stories" : "Start your first story"}
              </h3>
              <p>
                {rows.length
                  ? "Try another search or status."
                  : "Write here or paste your prepared text above."}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
