'use client';

import { useEffect, useState } from 'react';
import { shell, wrap, card, btn, btnMagenta, btnDark, inp, label, h1, api, organizerAccessMessage, useToast, Toast } from '../../ui';

interface Tier { name: string; price: number }

export default function NewEventForm() {
  const [ready, setReady] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([{ name: 'Regular', price: 0 }]);
  const [busy, setBusy] = useState(false);
  const [toast, say] = useToast();

  useEffect(() => {
    api('/api/organizer/me').then(({ data }) => {
      if (!data.organizer) setAccessError(organizerAccessMessage(data.error));
      else setReady(true);
    });
  }, []);

  const setTier = (i: number, patch: Partial<Tier>) => setTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const submit = async () => {
    if (name.trim().length < 2) return say('Event name is required');
    if (!eventDate) return say('Enter the event date');
    if (!venue.trim()) return say('Enter the venue');
    if (!city.trim()) return say('Enter the city');
    if (!description.trim()) return say('Add a description for buyers and reviewers');
    if (!tiers.length || tiers.some((t) => !t.name.trim())) return say('Every ticket tier needs a name');
    setBusy(true);
    const { data } = await api('/api/organizer/events', {
      method: 'POST',
      body: JSON.stringify({ name, eventDate, venue, city, description, image, tiers }),
    });
    setBusy(false);
    if (data.ok) window.location.href = '/organizer/dashboard';
    else say('Failed: ' + (data.error || 'unknown error'));
  };

  if (accessError) return <div style={shell}><div style={wrap}><div style={card}>{accessError}<div style={{ marginTop: 14 }}><a href="/organizer/login" style={{ ...btnMagenta, textDecoration: 'none', display: 'inline-block' }}>Organizer login</a></div></div></div></div>;
  if (!ready) return <div style={shell}><div style={wrap}><div style={card}>Checking organizer access…</div></div></div>;

  return (
    <div style={shell}>
      <div style={wrap}>
        <Toast msg={toast} />
        <h1 style={h1}>Submit a new event</h1>
        <p style={{ color: '#bbb', marginBottom: 18 }}>Your event is submitted for review — a UGT admin approves it before it appears publicly and can be sold.</p>
        <div style={card}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label htmlFor="evt-name" style={label}>Event name *</label>
              <input id="evt-name" style={inp} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="evt-date" style={label}>Date</label>
                <input id="evt-date" style={inp} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div>
                <label htmlFor="evt-city" style={label}>City</label>
                <input id="evt-city" style={inp} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Nairobi" />
              </div>
            </div>
            <div>
              <label htmlFor="evt-venue" style={label}>Venue</label>
              <input id="evt-venue" style={inp} value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div>
              <label htmlFor="evt-description" style={label}>Description</label>
              <textarea id="evt-description" style={{ ...inp, minHeight: 90 }} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label htmlFor="evt-image" style={label}>Image URL</label>
              <input id="evt-image" style={inp} value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <span style={label}>Ticket tiers (real prices — checkout charges exactly this) *</span>
              {tiers.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input
                    style={{ ...inp, flex: 2 }}
                    aria-label={`Tier ${i + 1} name`}
                    value={t.name}
                    onChange={(e) => setTier(i, { name: e.target.value })}
                    placeholder="Tier name"
                  />
                  <input
                    style={{ ...inp, flex: 1 }}
                    type="number"
                    min={0}
                    aria-label={`Tier ${i + 1} price in KES`}
                    value={t.price}
                    onChange={(e) => setTier(i, { price: Number(e.target.value) || 0 })}
                    placeholder="Price KES"
                  />
                  {tiers.length > 1 && (
                    <button style={btnDark} aria-label={`Remove tier ${i + 1}`} onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </div>
              ))}
              <button style={btn} onClick={() => setTiers([...tiers, { name: '', price: 0 }])}>+ Add tier</button>
            </div>
            <button style={{ ...btnMagenta, marginTop: 4 }} disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit for review'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
