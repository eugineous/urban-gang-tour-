"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Uploads from "./ops/Gallery";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import { useUnsavedWarning } from "@/lib/client/use-unsaved-warning";
import { isDraftId } from "@/lib/story-draft";
import {chronological,type Chronology} from '@/lib/chronology';
type Photo = {
  id: number;
  url: string;
  caption: string;
  category: string;
  alt_text: string;
  published: boolean;
  folder_id: string | null;
  version: number;
  removed_at: string | null;
  created_at?:string;
};
type Folder = { id: string; name: string; version: number };
const validFolder = (row: Folder) =>
  row &&
  isDraftId(row.id) &&
  typeof row.name === "string" &&
  row.name.trim().length > 0 &&
  Number.isSafeInteger(row.version) &&
  row.version > 0;
type Draft = { caption: string; category: string; altText: string };
const valid = (row: Photo) =>
  row &&
  Number.isSafeInteger(row.id) &&
  typeof row.url === "string" &&
  Number.isSafeInteger(row.version) &&
  row.version > 0 &&
  typeof row.caption === "string" &&
  typeof row.category === "string" &&
  typeof row.alt_text === "string" &&
  typeof row.published === "boolean";
async function request(body?: unknown) {
  const response = await fetchWithTimeout(
    "/api/admin/media-library",
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
    20000,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw Error(data.error || "not_confirmed");
  return data;
}
export default function MediaDesk() {
  const [rows, setRows] = useState<Photo[]>([]),
    [folders, setFolders] = useState<Folder[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [owner, setOwner] = useState(false),
    [uploads, setUploads] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [view, setView] = useState("all"),
    [folder, setFolder] = useState("all"),
    [name, setName] = useState(""),
    [renaming, setRenaming] = useState<Folder | null>(null),
    [destination, setDestination] = useState("");
  const [selected, setSelected] = useState<number[]>([]),
    [edit, setEdit] = useState<Photo | null>(null),
    [draft, setDraft] = useState<Draft>({
      caption: "",
      category: "",
      altText: "",
    });
  const pending = useRef(false);
  const [sort,setSort]=useState<Chronology>('newest');
  const dirty =
    !!edit &&
    (edit.caption !== draft.caption ||
      edit.category !== draft.category ||
      edit.alt_text !== draft.altText);
  useUnsavedWarning(dirty || busy);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request();
      if (
        !Array.isArray(data.rows) ||
        !data.rows.every(valid) ||
        !Array.isArray(data.folders) ||
        !data.folders.every(validFolder)
      )
        throw Error();
      setRows(data.rows);
      setFolders(data.folders);
      setOwner(data.canPublish === true);
      setError("");
    } catch {
      setError(
        "The library could not be loaded. Existing photos and your entries are kept. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function mutate(input: Record<string, unknown>) {
    const data = await request(input),
      row = data.row;
    if (
      !row ||
      typeof row.version !== "number" ||
      (input.action !== "folder.create" &&
        (row.id !== input.id || row.version !== Number(input.version) + 1))
    )
      throw Error("not_confirmed");
    if (String(input.action).startsWith("photo.") && !valid(row))
      throw Error("not_confirmed");
    if (
      (input.action === "photo.save" &&
        (row.caption !== input.caption ||
          row.category !== input.category ||
          row.alt_text !== input.altText)) ||
      (input.action === "photo.publish" && !row.published) ||
      (input.action === "photo.unpublish" && row.published) ||
      (input.action === "photo.trash" && (!row.removed_at || row.published)) ||
      (input.action === "photo.restore" && (row.removed_at || row.published)) ||
      (input.action === "photo.move" && row.folder_id !== input.folderId)
    )
      throw Error("not_confirmed");
    if (
      String(input.action).startsWith("folder.") &&
      (!isDraftId(row.id) ||
        row.name !== String(input.name).trim().replace(/\s+/g, " ") ||
        (input.action === "folder.create" && row.version !== 1))
    )
      throw Error("not_confirmed");
    return row;
  }
  function failure(code: string) {
    return code === "folder_exists"
      ? "That folder name is already in use."
      : code === "metadata_or_version_changed"
        ? "Save caption, category and image description first. Refresh if another editor changed this photo."
        : code === "owner_review_required"
          ? "The owner must approve public changes."
          : "The change could not be confirmed. Your entries are kept. Check the current record before retrying.";
  }
  async function change(input: Record<string, unknown>) {
    if (pending.current) return;
    if(dirty && !String(input.action).startsWith('folder.') && input.action!=='photo.save'){
      setError('Save or close your photo edits first. Your draft is kept.');return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await mutate(input);
      if (String(input.action).startsWith("folder.")) {
        setFolders((current) => [
          row,
          ...current.filter((item) => item.id !== row.id),
        ]);
        setName("");
        setRenaming(null);
        setNotice("Folder saved. No photos were published.");
      } else {
        setRows((current) =>
          current.map((item) => (item.id === row.id ? row : item)),
        );
        setEdit(row);
        setDraft({
          caption: row.caption,
          category: row.category,
          altText: row.alt_text,
        });
        setNotice(
          input.action === "photo.publish"
            ? "Photo published."
            : input.action === "photo.trash"
              ? "Moved to removed photos. The file is kept."
              : input.action === "photo.restore"
                ? "Restored privately. Review before publishing."
                : "Photo saved.",
        );
      }
    } catch (error) {
      setError(failure(error instanceof Error ? error.message : ""));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function bulk(action: string) {
    if (pending.current || !selected.length) return;
    if(dirty&&edit&&selected.includes(edit.id)){setError('Save or close your current photo edits before changing selected photos. Your draft is kept.');return}
    if (
      action === "photo.trash" &&
      !confirm(
        `Move ${selected.length} photos to Removed? Files are kept for restoration.`,
      )
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const failed: number[] = [];
    let completed = 0;
    for (const id of selected) {
      const photo = rows.find((item) => item.id === id);
      if (!photo) continue;
      try {
        const row = await mutate({
          action,
          id,
          version: photo.version,
          ...(action === "photo.move" ? { folderId: destination || null } : {}),
        });
        setRows((current) =>
          current.map((item) => (item.id === id ? row : item)),
        );
        setEdit((current) => (current?.id === id ? row : current));
        completed++;
      } catch {
        failed.push(id);
      }
    }
    setSelected(failed);
    setNotice(
      `${completed} photos updated.${failed.length ? " Unfinished photos remain selected." : ""}`,
    );
    if (failed.length)
      setError(
        "Some changes were not confirmed. Saved photos are kept. Refresh and review the selected records before retrying.",
      );
    pending.current = false;
    setBusy(false);
  }
  const filtered = rows.filter(
    (row) =>
      (view === "removed"
        ? !!row.removed_at
        : !row.removed_at &&
          (view === "all" || (view === "published") === row.published)) &&
      (folder === "all" ||
        (folder === "none" ? !row.folder_id : row.folder_id === folder)) &&
      [row.caption, row.category, row.alt_text]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const shown=chronological(filtered,sort,row=>row.created_at,row=>row.caption,row=>String(row.id));
  return (
    <div className="cr-media-desk">
      <section className="cr-panel">
        <div className="cr-toolbar">
          <div>
            <h2>Photo library</h2>
            <p className="cr-muted">
              Upload privately. Choose what goes public.
            </p>
          </div>
          <button
            className="cr-primary"
            onClick={() => setUploads((value) => !value)}
            aria-expanded={uploads}
          >
            ＋ Upload photos
          </button>
        </div>
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
        <div className="cr-filter-row">
          <label className="cr-field">Order<select value={sort} onChange={event=>setSort(event.target.value as Chronology)}><option value="newest">Newest added</option><option value="oldest">Oldest added</option><option value="title">Caption A–Z</option></select></label>
          <label className="cr-field">
            Find photos
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Caption, school or description"
            />
          </label>
          <label className="cr-field">
            Show
            <select
              value={view}
              onChange={(event) => {
                setView(event.target.value);
                setSelected([]);
              }}
            >
              <option value="all">All photos</option>
              <option value="private">Private</option>
              <option value="published">Published</option>
              <option value="removed">Removed photos</option>
            </select>
          </label>
          <label className="cr-field">
            Folder
            <select
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
                setSelected([]);
              }}
            >
              <option value="all">All folders</option>
              <option value="none">Not in a folder</option>
              {folders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="cr-disclosure">
          <summary>Organise folders</summary>
          <label className="cr-field">
            {renaming ? "Rename folder" : "New folder name"}
            <input
              value={name}
              maxLength={80}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="cr-actions">
            <button
              className="cr-secondary"
              disabled={busy || !name.trim()}
              onClick={() =>
                void change(
                  renaming
                    ? {
                        action: "folder.rename",
                        id: renaming.id,
                        version: renaming.version,
                        name,
                      }
                    : { action: "folder.create", name },
                )
              }
            >
              Save folder
            </button>
            {renaming && (
              <button
                className="cr-text-link"
                onClick={() => {
                  setRenaming(null);
                  setName("");
                }}
              >
                Cancel rename
              </button>
            )}
            {folders.map((item) => (
              <button
                key={item.id}
                className="cr-text-link"
                disabled={busy}
                onClick={() => {
                  setRenaming(item);
                  setName(item.name);
                }}
              >
                Rename {item.name}
              </button>
            ))}
          </div>
        </details>
        <div className="cr-actions">
          <button
            className="cr-text-link"
            disabled={busy || loading}
            onClick={() => void reload()}
          >
            Refresh photos
          </button>
          <span className="cr-muted" role="status">
            {loading ? "Loading photos…" : `${shown.length} photos`}
          </span>
        </div>
      </section>
      <div hidden={!uploads}>
        <Uploads uploadsOnly onComplete={reload} />
      </div>
      {edit && (
        <section className="cr-panel cr-photo-editor" aria-label="Photo editor">
          <img src={edit.url} alt={draft.altText || "Photo being edited"} />
          <div>
            <div className="cr-toolbar">
              <h2>Edit photo</h2>
              <button
                className="cr-text-link"
                disabled={busy}
                onClick={() => {
                  if (!dirty || confirm("Close without saving photo changes?"))
                    setEdit(null);
                }}
              >
                Close photo
              </button>
            </div>
            <fieldset
              className="cr-fieldset"
              disabled={busy || !!edit.removed_at || (!owner && edit.published)}
            >
              <label className="cr-field">
                Caption
                <input
                  value={draft.caption}
                  maxLength={300}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      caption: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="cr-field">
                Category / school
                <input
                  value={draft.category}
                  maxLength={120}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="cr-field">
                Image description
                <input
                  value={draft.altText}
                  maxLength={300}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      altText: event.target.value,
                    }))
                  }
                />
              </label>
              <p role="status" className="cr-muted">
                {dirty
                  ? "Unsaved photo changes."
                  : "Showing saved photo details."}
              </p>
              <div className="cr-actions">
                <button
                  className="cr-primary"
                  disabled={!dirty}
                  onClick={() =>
                    void change({
                      action: "photo.save",
                      id: edit.id,
                      version: edit.version,
                      ...draft,
                    })
                  }
                >
                  Save photo details
                </button>
                {owner && (
                  <button
                    className="cr-secondary"
                    disabled={
                      dirty ||
                      (!edit.published &&
                        (!edit.caption.trim() ||
                          !edit.category.trim() ||
                          !edit.alt_text.trim()))
                    }
                    onClick={() =>
                      void change({
                        action: edit.published
                          ? "photo.unpublish"
                          : "photo.publish",
                        id: edit.id,
                        version: edit.version,
                      })
                    }
                  >
                    {edit.published ? "Unpublish photo" : "Publish photo"}
                  </button>
                )}
              </div>
            </fieldset>
            {edit.removed_at && (
              <button
                className="cr-secondary"
                disabled={busy || !owner}
                onClick={() =>
                  void change({
                    action: "photo.restore",
                    id: edit.id,
                    version: edit.version,
                  })
                }
              >
                Restore privately
              </button>
            )}
          </div>
        </section>
      )}
      {!!selected.length && (
        <section className="cr-panel cr-selection" aria-label="Selected photos">
          <strong>{selected.length} selected</strong>
          <div className="cr-actions">
            <label className="cr-field">
              Move to folder
              <select
                value={destination}
                disabled={busy}
                onChange={(event) => setDestination(event.target.value)}
              >
                <option value="">Not in a folder</option>
                {folders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="cr-secondary"
              disabled={busy || dirty || view === "removed"}
              onClick={() => void bulk("photo.move")}
            >
              Move selected
            </button>
            {owner && (
              <>
                <button
                  className="cr-secondary"
                  disabled={busy || dirty}
                  onClick={() =>
                    void bulk(
                      view === "removed" ? "photo.restore" : "photo.trash",
                    )
                  }
                >
                  {view === "removed"
                    ? "Restore selected privately"
                    : "Move selected to removed"}
                </button>
                {view !== "removed" && (
                  <button
                    className="cr-secondary"
                    disabled={busy || dirty}
                    onClick={() => void bulk("photo.publish")}
                  >
                    Publish selected
                  </button>
                )}
              </>
            )}
            <button
              className="cr-text-link"
              disabled={busy}
              onClick={() => setSelected([])}
            >
              Clear selection
            </button>
          </div>
        </section>
      )}
      <div className="cr-record-grid cr-photo-grid">
        {shown.map((photo) => (
          <article key={photo.id} className="cr-photo-card">
            <img src={photo.url} alt={photo.alt_text || ""} loading="lazy" />
            <div className="cr-card-body">
              <label className="cr-check">
                <input
                  type="checkbox"
                  disabled={busy || (!owner && photo.published)}
                  checked={selected.includes(photo.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, photo.id]
                        : current.filter((id) => id !== photo.id),
                    )
                  }
                />
                Select {photo.caption || "photo " + photo.id}
              </label>
              <span className="cr-badge">
                {photo.removed_at
                  ? "Removed"
                  : photo.published
                    ? "Published"
                    : "Private"}
              </span>
              <p>{photo.caption || "Add a caption"}</p>
              <button
                className="cr-secondary"
                disabled={busy}
                onClick={() => {
                  if (dirty && !confirm("Close this photo without saving?"))
                    return;
                  setEdit(photo);
                  setDraft({
                    caption: photo.caption || "",
                    category: photo.category || "",
                    altText: photo.alt_text || "",
                  });
                  setNotice("");
                  setError("");
                }}
              >
                Edit photo
              </button>
            </div>
          </article>
        ))}
      </div>
      {!loading && !shown.length && (
        <div className="cr-panel cr-empty">
          <h3>No photos in this view</h3>
          <p>Upload photos or try another filter.</p>
        </div>
      )}
    </div>
  );
}
