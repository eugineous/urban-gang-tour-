'use client';
import {MessageText} from '@/ui/i18n/MessageText';
import {mediaMessages} from '@/ui/i18n/catalogues/media';
import {useMessages} from '@/ui/i18n/LanguageProvider';

import { useEffect, useRef, useState } from 'react';

type Photo = { id: string; url: string; category?: string; caption?: string; altText?: string };

export function PhotoGallery({ photos }: { photos: Photo[] }) {const t=useMessages(mediaMessages);
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
    <nav className="ugt-photo-filters" aria-label={t("photoCategories")}>
      <button aria-pressed={!category} onClick={() => setCategory('')}><MessageText catalogue={mediaMessages} message="allPhotos"/></button>
      {[...new Set(photos.map(photo => photo.category).filter(Boolean))].map(name => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name || '')} lang="en-KE">{name}</button>)}
    </nav>
    <div className="ugt-photo-grid">{filtered.map(photo => <button key={photo.id} onClick={() => { setSelected(photo.id); setZoom(false); }} aria-label={t('viewPhoto',{title:photo.caption||photo.altText||photo.category||t('tourPhoto')})}>
      <img lang="en-KE" src={photo.url} alt={photo.altText || photo.caption || photo.category || 'Urban Gang Tour'} loading="lazy" decoding="async" />
      {(photo.caption || photo.category) && <span lang="en-KE">{photo.caption || photo.category}</span>}
    </button>)}</div>
    <dialog ref={dialog} className="ugt-photo-viewer" aria-label={t("photoViewer")} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    }}>
      {photo && <><div className="ugt-photo-toolbar"><span>{index + 1} / {filtered.length}</span><button onClick={() => setZoom(!zoom)} aria-pressed={zoom}>{t(zoom?'fit':'zoom')}</button><button autoFocus onClick={() => setSelected(null)} aria-label={t("closePhoto")}><MessageText catalogue={mediaMessages} message="close"/></button></div>
        <div lang="en-KE" className={`ugt-photo-stage ${zoom ? 'zoomed' : ''}`}><img src={photo.url} alt={photo.altText || photo.caption || 'Urban Gang Tour'} /></div>
        <div className="ugt-photo-caption"><button disabled={filtered.length < 2} onClick={() => move(-1)}><MessageText catalogue={mediaMessages} message="previous"/></button><p lang="en-KE">{photo.caption || photo.category || 'Urban Gang Tour'}</p><button disabled={filtered.length < 2} onClick={() => move(1)}><MessageText catalogue={mediaMessages} message="next"/></button></div></>}
    </dialog>
  </section>;
}
