'use client';

import { useEffect, useRef, useState } from 'react';

type Photo = { id: string; url: string; category?: string; caption?: string; altText?: string };

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = photos.filter(photo => photo.url && (!category || photo.category === category));
  const index = filtered.findIndex(photo => photo.id === selected);
  const photo = filtered[index];
  const open = selected !== null;
  const move = (offset: number) => {
    setSelected(filtered[(index + offset + filtered.length) % filtered.length]?.id || null);
    setZoom(false);
  };

  useEffect(() => {
    if (!open || !dialog.current) return;
    dialog.current.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.current?.close();
    };
  }, [open]);

  return <section className="ugt-photo-gallery">
    <nav className="ugt-photo-filters" aria-label="Photo categories">
      <button aria-pressed={!category} onClick={() => setCategory('')}>All photos</button>
      {[...new Set(photos.map(photo => photo.category).filter(Boolean))].map(name => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name || '')}>{name}</button>)}
    </nav>
    <div className="ugt-photo-grid">{filtered.map(photo => <button key={photo.id} onClick={() => { setSelected(photo.id); setZoom(false); }} aria-label={`View ${photo.caption || photo.altText || photo.category || 'tour photo'}`}>
      <img src={photo.url} alt={photo.altText || photo.caption || photo.category || 'Urban Gang Tour'} loading="lazy" decoding="async" />
      {(photo.caption || photo.category) && <span>{photo.caption || photo.category}</span>}
    </button>)}</div>
    <dialog ref={dialog} className="ugt-photo-viewer" aria-label="Photo viewer" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    }}>
      {photo && <><div className="ugt-photo-toolbar"><span>{index + 1} / {filtered.length}</span><button onClick={() => setZoom(!zoom)} aria-pressed={zoom}>{zoom ? 'Fit image' : 'Zoom image'}</button><button autoFocus onClick={() => setSelected(null)} aria-label="Close photo">Close</button></div>
        <div className={`ugt-photo-stage ${zoom ? 'zoomed' : ''}`}><img src={photo.url} alt={photo.altText || photo.caption || 'Urban Gang Tour'} /></div>
        <div className="ugt-photo-caption"><button disabled={filtered.length < 2} onClick={() => move(-1)}>Previous</button><p>{photo.caption || photo.category || 'Urban Gang Tour'}</p><button disabled={filtered.length < 2} onClick={() => move(1)}>Next</button></div></>}
    </dialog>
  </section>;
}
