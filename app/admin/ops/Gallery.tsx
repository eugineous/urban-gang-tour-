'use client';

// Gallery management; the Worker persists uploads in KV.
import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@/lib/client/media-upload';
import {runUploadQueue,type QueueItem} from '@/lib/client/upload-queue';
import {useUnsavedWarning} from '@/lib/client/use-unsaved-warning';
import {
  OC, card, btn, btnSmall, inp, label, h3,
  api, Toast, useToast,
  SearchBox, useSearch,
} from './ui';

interface Photo {
  id: number;
  url: string;
  caption: string;
  category: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  published: boolean;
  sort_order: number;
  created_at: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

function galleryGet() {
  return api('/api/admin/gallery');
}
function galleryPost(kind: string, data: any) {
  return api('/api/admin/gallery', { method: 'POST', body: JSON.stringify({ kind, data }) });
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'photo';
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const timer=setTimeout(()=>{URL.revokeObjectURL(url);reject(new Error('image_inspection_failed'))},10000);
    image.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (!image.naturalWidth || !image.naturalHeight) return reject(new Error('invalid_image_dimensions'));
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { clearTimeout(timer);URL.revokeObjectURL(url); reject(new Error('image_inspection_failed')); };
    image.src = url;
  });
}

function frameLabel(photo: Photo): string {
  if (!photo.width || !photo.height) return 'Original dimensions not recorded';
  const ratio = photo.width / photo.height;
  const shape = ratio > 1.1 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square';
  return `${photo.width} × ${photo.height}, ${shape}`;
}

export default function Gallery() {
  const [rows, setRows] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const uploading=useRef(false);
  const [queue,setQueue]=useState<QueueItem[]>([]);
  const [batchCategory,setBatchCategory]=useState('');
  useUnsavedWarning(busy||queue.some(item=>item.state==='failed'||item.state==='pending'));
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { caption: string; category: string; altText: string }>>({});
  const [canPublish, setCanPublish] = useState(false);
  const [toast, say] = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [qy, setQy] = useState('');
  const shown = useSearch(rows, qy);

  const reload = useCallback(async () => {
    const { data } = await galleryGet();
    if (data.error) { say('Load failed: ' + data.error); return; }
    const list: Photo[] = data.rows || [];
    setRows(list);
    setCanPublish(!!data.capabilities?.publish);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of list) {
        if (!next[p.id]) next[p.id] = { caption: p.caption || '', category: p.category || '', altText: p.alt_text || '' };
      }
      return next;
    });
  }, [say]);
  useEffect(() => { reload(); }, [reload]);

  const doBatch = async (items:QueueItem[]) => {
    if(uploading.current)return;
    uploading.current=true;
    setBusy(true);
    setUploadPct(0);
    try {
      const update=(id:string,patch:Partial<QueueItem>)=>setQueue(current=>current.map(item=>item.id===id?{...item,...patch}:item));
      await runUploadQueue(items,async(item,progress)=>{
        const file=item.file;
        if(!ALLOWED_TYPES.includes(file.type)||!file.size||file.size>MAX_BYTES)throw new Error('invalid_image');
        const dimensions=await readImageDimensions(file);
        const blob=item.url?{url:item.url}:await upload(item.path,file,{
          access:'public',handleUploadUrl:'/api/admin/gallery/upload',onUploadProgress:event=>{setUploadPct(Math.round(event.percentage));progress(Math.round(event.percentage));},
        });
        update(item.id,{url:blob.url});
        const {status,data}=await galleryPost('upload',{url:blob.url,caption:'',category:item.category,...dimensions});
        if(status<200||status>=300||!data.ok)throw new Error('record_not_confirmed');
      },update);
      say(items.length===1?'Photo upload checked':'Batch finished. Check each photo below.');
      await reload();
    } finally {
      uploading.current=false;
      setBusy(false);setUploadPct(null);
      if(fileRef.current)fileRef.current.value='';
    }
  };
  const addFiles=(files:File[])=>{
    if(uploading.current)return;
    if(files.length>20){say('Choose up to 20 photos at a time. Nothing was uploaded.');return}
    if(!files.length)return;
    if(queue.length+files.length>20){say('Clear finished photos from this list, or remove unfinished ones, before adding more. Saved photos are kept in the gallery.');return}
    const items:QueueItem[]=files.map(file=>{
      const id=crypto.randomUUID();return {id,file,path:`gallery/${id}-${safeName(file.name)}`,category:batchCategory.trim(),state:'pending',progress:0};
      });
    setQueue(current=>[...current,...items]);void doBatch(items);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files||[]));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const saveMeta = async (p: Photo) => {
    const d = drafts[p.id] || { caption: '', category: '', altText: '' };
    const { data } = await galleryPost('update', { id: p.id, caption: d.caption, category: d.category, altText: d.altText });
    if (data.error) { say('Save failed: ' + data.error); return; }
    say('Saved');
    reload();
  };

  const setPublished = async (p: Photo, published: boolean) => {
    const { data } = await galleryPost('publish', { id: p.id, published });
    if (data.error) {
      say(data.error === 'publication_metadata_required' ? 'Save caption, category and image description before publishing' : 'Publish change failed: ' + data.error);
      return;
    }
    say(published ? 'Published to the public gallery' : 'Moved back to review');
    reload();
  };

  const move = async (p: Photo, dir: -1 | 1) => {
    const published = rows.filter((row) => row.published);
    const index = published.findIndex((row) => row.id === p.id);
    const target = index + dir;
    if (target < 0 || target >= published.length) return;
    const next = published.slice();
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setRows([...rows.filter((row) => !row.published), ...next]);
    const { data } = await galleryPost('reorder', { ids: next.map((r) => r.id) });
    if (data.error) { say('Reorder failed: ' + data.error); reload(); }
  };

  const remove = async (p: Photo) => {
    if (!confirm(`Remove this ${p.published ? 'published' : 'draft'} photo? This removes it from the gallery and, if it was an admin upload, permanently deletes the file.`)) return;
    const { data } = await galleryPost('delete', { id: p.id });
    if (data.error) { say('Delete failed: ' + data.error); return; }
    say('Deleted');
    reload();
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>GALLERY / PHOTO WALL</h3>
          <div style={{ flex: 1 }} />
          <SearchBox value={qy} onChange={setQy} placeholder="Search by caption or category..." />
        </div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          Review the original frame first, then publish. Drafts stay private in this desk. Publishing requires a caption, category and an image description written from what is actually visible. Only the super admin can release, remove or order public media. Reordering is disabled while searching.
        </div>
        {!canPublish && <div style={{ fontSize: 12, color: OC.magenta, fontWeight: 800, marginBottom: 10 }}>You can upload and prepare private media. A super admin completes public review.</div>}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            border: `3px dashed ${dragOver ? OC.magenta : '#111'}`,
            borderRadius: 14,
            padding: 20,
            textAlign: 'center',
            background: dragOver ? '#FCE9F4' : '#fafafa',
            marginBottom: 4,
          }}
        >
          <label style={{display:'grid',gap:6,marginBottom:12,textAlign:'left'}}>Category for this batch<input style={inp} maxLength={120} value={batchCategory} disabled={busy} onChange={e=>setBatchCategory(e.target.value)} placeholder="Choose a school, event or new category name"/></label>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Choose gallery photos" style={{ display: 'none' }} onChange={onPick} disabled={busy} />
          <div style={{ fontSize: 13, marginBottom: 10 }}>Drag a photo here, or</div>
          <button style={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? (uploadPct !== null ? `Uploading… ${uploadPct}%` : 'Uploading…') : '+ Upload photos'}
          </button>
          <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Choose or drop up to 20 photos. JPG, PNG or WebP, 8 MB each. Uploads stay private until reviewed.</div>
        </div>
      </div>
      {queue.length>0&&<section style={card} aria-label="Photo upload progress"><h3>Upload progress</h3><ul style={{paddingLeft:20}}>{queue.map(item=><li key={item.id} style={{overflowWrap:'anywhere',marginBottom:10}}>{item.file.name} — {item.state==='done'?'Saved privately':item.state==='failed'?item.error:item.state==='uploading'?`Uploading ${item.progress}%`:'Waiting'}{item.state==='uploading'&&<progress value={item.progress} max={100} aria-label={'Upload progress for '+item.file.name}/>}</li>)}</ul><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button style={btnSmall} disabled={busy||!queue.some(item=>item.state==='failed')} onClick={()=>void doBatch(queue.filter(item=>item.state==='failed'))}>Retry unfinished photos</button><button style={btnSmall} disabled={busy} onClick={()=>setQueue(current=>current.filter(item=>item.state!=='done'))}>Clear finished from this list</button><button style={btnSmall} disabled={busy} onClick={()=>{if(confirm('Remove unfinished photos from this upload list? Saved gallery photos will not be deleted.'))setQueue(current=>current.filter(item=>item.state==='done'))}}>Remove unfinished from this list</button></div></section>}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {shown.map((p) => {
          const d = drafts[p.id] || { caption: '', category: '', altText: '' };
          const publishedRows = rows.filter((row) => row.published);
          const i = publishedRows.findIndex((r) => r.id === p.id);
          const reorderDisabled = qy.trim().length > 0 || !p.published || !canPublish;
          const metadataReady = !!d.caption.trim() && !!d.category.trim() && !!d.altText.trim();
          const metadataSaved = d.caption === (p.caption || '') && d.category === (p.category || '') && d.altText === (p.alt_text || '');
          return (
            <div key={p.id} style={{ ...card, padding: 10, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, fontWeight: 800 }}>
                <span style={{ background: p.published ? '#E7F5EE' : '#FDF2D9', color: p.published ? OC.green : OC.orange, borderRadius: 99, padding: '3px 8px' }}>{p.published ? 'PUBLIC' : 'PRIVATE REVIEW'}</span>
                <span style={{ color: '#666' }}>{frameLabel(p)}</span>
              </div>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd', aspectRatio: '4/3', background: '#111' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={d.altText || p.alt_text || 'Unlabelled gallery photo'} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>Original frame shown for review. Check any public crop after publication.</div>
              <div>
                <span style={label}>Caption</span>
                <input style={inp} value={d.caption} onChange={(e) => setDrafts({ ...drafts, [p.id]: { ...d, caption: e.target.value } })} placeholder="e.g. Runway finale — Loreto Kiambu" />
              </div>
              <div>
                <span style={label}>Category / school</span>
                <input style={inp} value={d.category} onChange={(e) => setDrafts({ ...drafts, [p.id]: { ...d, category: e.target.value } })} placeholder="e.g. Loreto Kiambu Girls" />
              </div>
              <div>
                <span style={label}>Image description for screen readers *</span>
                <input style={inp} value={d.altText} onChange={(e) => setDrafts({ ...drafts, [p.id]: { ...d, altText: e.target.value } })} placeholder="Describe only what is visibly confirmed in the frame" />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button style={btnSmall} onClick={() => saveMeta(p)}>Save</button>
                <button title={canPublish ? (p.published ? 'Move this asset back to private review' : !metadataReady ? 'Save all required metadata before publishing' : !metadataSaved ? 'Save metadata before publishing' : 'Publish to the public photo wall') : 'Super admin review required'} style={{ ...btnSmall, background: p.published ? '#111' : OC.magenta, color: '#fff' }} disabled={!canPublish || (!p.published && (!metadataReady || !metadataSaved))} onClick={() => setPublished(p, !p.published)}>
                  {p.published ? 'Unpublish' : 'Publish'}
                </button>
                <button title={reorderDisabled ? 'Only published media can be reordered by a super admin when not searching' : 'Move earlier in the public gallery'} style={btnSmall} disabled={reorderDisabled || i <= 0} onClick={() => move(p, -1)}>↑ Move up</button>
                <button title={reorderDisabled ? 'Only published media can be reordered by a super admin when not searching' : 'Move later in the public gallery'} style={btnSmall} disabled={reorderDisabled || i === publishedRows.length - 1} onClick={() => move(p, 1)}>↓ Move down</button>
                <button title={canPublish ? 'Remove this gallery record' : 'Super admin review required'} style={{ ...btnSmall, background: '#111', color: '#fff' }} disabled={!canPublish} onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          );
        })}
        {!shown.length && <div style={{ ...card, gridColumn: '1 / -1' }}>{rows.length ? 'No photos match your search.' : 'No photos yet — upload the first one above.'}</div>}
      </div>
    </div>
  );
}
