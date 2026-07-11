'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shell, wrap, card, btn, btnMagenta, btnDark, inp, label, h1, Chip, STATUS_CHIP, api, useToast, Toast } from '../../../ui';

interface Tier { name: string; price: number }

export default function EditEventForm() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState('draft');
  const [ticketsSold, setTicketsSold] = useState(0);
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  const locked = status === 'published' && ticketsSold > 0;

  useEffect(() => {
    if (!id) return;
    api('/api/organizer/me').then(({ data }) => {
      if (!data.organizer) { window.location.href = '/organizer/login'; return; }
      api(`/api/organizer/events/${id}`).then(({ status: st, data: d }) => {
        if (st !== 200) { setNotFound(true); setReady(true); return; }
        const r = d.row;
        setStatus(r.status);
        setTicketsSold(d.ticketsSold || 0);
        setName(r.name);
        setEventDate(r.event_date || '');
        setVenue(r.venue || '');
        setCity(r.city || '');
        setDescription(r.description || '');
        setImage(r.image || '');
        try { setTiers(typeof r.tiers === 'string' ? JSON.parse(r.tiers) : r.tiers || []); } catch { setTiers([]); }
        setReady(true);
      });
    });
  }, [id]);

  const setTier = (i: number, patch: Partial<Tier>) => setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const submit = async () => {
    if (name.trim().length < 2) return say('Event name is required');
    setBusy(true);
    const body: any = { name, description, image };
    if (!locked) Object.assign(body, { eventDate: eventDate || null, venue, city, tiers });
    const { data } = await api(`/api/organizer/events/${id}`, { method: 'POST', body: JSON.stringify(body) });
    setBusy(false);
    if (data.ok) { say('Saved'); window.location.href = '/organizer/dashboard'; }
    else say('Failed: ' + (data.error || 'unknown error'));
  };

  if (!ready) return null;
  if (notFound) return <div style={shell}><div style={wrap}><div style={{ ...card, background: '#fff' }}>Event not found.</div></div></div>;

  const st = STATUS_CHIP[status] || STATUS_CHIP.draft;

  return (
    <div style={shell}>
      <div style={wrap}>
        <Toast msg={toast} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ ...h1, marginBottom: 0 }}>Edit event</h1>
          <Chip text={status.replace('_', ' ')} bg={st.bg} color={st.color} />
        </div>
        {locked && (
          <div style={{ ...card, background: '#FDF2D9', marginBottom: 16, fontSize: 13 }}>
            This event is live and already has {ticketsSold} ticket{ticketsSold > 1 ? 's' : ''} sold — date, venue, city and
            ticket prices are locked so buyers who already paid are never affected. You can still edit the name, description and image.
          </div>
        )}
        <div style={card}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div><span style={label}>Event name *</span><input style={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={label}>Date</span><input style={inp} type="date" value={eventDate} disabled={locked} onChange={(e) => setEventDate(e.target.value)} /></div>
              <div><span style={label}>City</span><input style={inp} value={city} disabled={locked} onChange={(e) => setCity(e.target.value)} /></div>
            </div>
            <div><span style={label}>Venue</span><input style={inp} value={venue} disabled={locked} onChange={(e) => setVenue(e.target.value)} /></div>
            <div><span style={label}>Description</span><textarea style={{ ...inp, minHeight: 90 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><span style={label}>Image URL</span><input style={inp} value={image} onChange={(e) => setImage(e.target.value)} /></div>
            <div>
              <span style={label}>Ticket tiers{locked ? ' (locked — tickets already sold)' : ''}</span>
              {tiers.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input style={{ ...inp, flex: 2 }} value={t.name} disabled={locked} onChange={(e) => setTier(i, { name: e.target.value })} />
                  <input style={{ ...inp, flex: 1 }} type="number" min={0} value={t.price} disabled={locked} onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })} />
                  {!locked && tiers.length > 1 && <button style={btnDark} onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}>✕</button>}
                </div>
              ))}
              {!locked && <button style={btn} onClick={() => setTiers([...tiers, { name: '', price: 0 }])}>+ Add tier</button>}
            </div>
            <button style={{ ...btnMagenta, marginTop: 4 }} disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
