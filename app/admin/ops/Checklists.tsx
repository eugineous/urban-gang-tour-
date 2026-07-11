'use client';

// Event checklists. A master template (editable) is copied onto each event;
// ticking an item stamps the time it was done. Progress shows on the
// dashboard for the next upcoming event.

import { useCallback, useEffect, useState } from 'react';
import {
  OC, card, btnMagenta, btnSmall, inp, label, h3,
  fmtDate, opsGet, opsPost, useEvents, FilterableEventSelect, Toast, useToast,
} from './ui';

export default function Checklists() {
  const { events } = useEvents();
  const [eventId, setEventId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newTpl, setNewTpl] = useState('');
  const [showTpl, setShowTpl] = useState(false);
  const [toast, say] = useToast();

  const loadTemplates = useCallback(async () => {
    const { data } = await opsGet('checklist_templates');
    if (data.error) say('Load failed: ' + data.error); else setTemplates(data.rows || []);
  }, [say]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const load = useCallback(async (id: number | null) => {
    setEventId(id);
    setItems([]);
    if (!id) return;
    const { data } = await opsGet('event', { id });
    if (data.error) say('Load failed: ' + data.error); else setItems(data.checklist || []);
  }, [say]);

  const done = items.filter((i) => i.done_at).length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Toast msg={toast} />
      <div style={card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <h3 style={{ ...h3, marginBottom: 0 }}>EVENT CHECKLISTS</h3>
          <div style={{ flex: 1 }} />
          <button style={{ ...btnSmall, background: showTpl ? OC.magenta : '#fff', color: showTpl ? '#fff' : '#111' }} onClick={() => setShowTpl(!showTpl)}>
            {showTpl ? 'Hide master template' : 'Edit master template'}
          </button>
        </div>
        <FilterableEventSelect events={events} value={eventId} onChange={load} allowNone />
      </div>

      {showTpl && (
        <div style={card}>
          <h3 style={h3}>MASTER TEMPLATE ({templates.length} items)</h3>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>New events copy this list. Editing it does not change checklists already copied onto events.</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {templates.map((t) => (
              <div key={t.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={inp} defaultValue={t.label} onBlur={async (e) => {
                  if (e.target.value === t.label || !e.target.value.trim()) return;
                  const { data } = await opsPost('checklist.template.save', { id: t.id, label: e.target.value });
                  if (data.error) say('Failed: ' + data.error); else loadTemplates();
                }} />
                <button style={{ ...btnSmall, background: '#111', color: '#fff' }} onClick={async () => {
                  const { data } = await opsPost('checklist.template.delete', { id: t.id });
                  if (data.error) say('Failed: ' + data.error); else loadTemplates();
                }}>x</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input style={inp} placeholder="New template item" value={newTpl} onChange={(e) => setNewTpl(e.target.value)} onKeyDown={async (e) => {
              if (e.key !== 'Enter' || !newTpl.trim()) return;
              const { data } = await opsPost('checklist.template.save', { label: newTpl });
              if (data.error) say('Failed: ' + data.error); else { setNewTpl(''); loadTemplates(); }
            }} />
            <button style={btnSmall} onClick={async () => {
              if (!newTpl.trim()) return;
              const { data } = await opsPost('checklist.template.save', { label: newTpl });
              if (data.error) say('Failed: ' + data.error); else { setNewTpl(''); loadTemplates(); }
            }}>Add</button>
          </div>
        </div>
      )}

      {eventId && (
        <div style={card}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <h3 style={{ ...h3, marginBottom: 0 }}>CHECKLIST</h3>
            <span style={{ fontSize: 13, fontWeight: 800, color: done === items.length && items.length > 0 ? OC.green : OC.orange }}>{done} / {items.length} done</span>
            <div style={{ flex: 1 }} />
            {!items.length && (
              <button style={btnMagenta} onClick={async () => {
                const { data } = await opsPost('checklist.init', { eventId });
                if (data.error) say('Failed: ' + data.error); else { say(`Copied ${data.added} items from the template`); load(eventId); }
              }}>Copy master template onto this event</button>
            )}
          </div>
          {items.length > 0 && (
            <div style={{ height: 10, border: '2px solid #111', borderRadius: 100, overflow: 'hidden', marginBottom: 12, background: '#eee' }}>
              <div style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, height: '100%', background: OC.green }} />
            </div>
          )}
          <div style={{ display: 'grid', gap: 6 }}>
            {items.map((i) => (
              <div key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'center', border: '2px solid #111', borderRadius: 10, padding: '8px 10px', background: i.done_at ? '#E7F5EE' : '#fff' }}>
                <input type="checkbox" checked={!!i.done_at} style={{ width: 18, height: 18, accentColor: OC.green }} onChange={async () => {
                  const { data } = await opsPost('checklist.item.toggle', { id: i.id });
                  if (data.error) say('Failed: ' + data.error); else load(eventId);
                }} />
                <span style={{ flex: 1, fontSize: 14, textDecoration: i.done_at ? 'line-through' : 'none', color: i.done_at ? '#5b8a6f' : '#111' }}>{i.label}</span>
                {i.done_at && <span style={{ fontSize: 11, color: OC.green, fontWeight: 700 }}>{fmtDate(i.done_at)}</span>}
                <button style={{ ...btnSmall, padding: '3px 7px', background: '#fff' }} onClick={async () => {
                  const { data } = await opsPost('checklist.item.delete', { id: i.id });
                  if (data.error) say('Failed: ' + data.error); else load(eventId);
                }}>x</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input style={inp} placeholder="Add a custom item for this event" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={async (e) => {
              if (e.key !== 'Enter' || !newItem.trim()) return;
              const { data } = await opsPost('checklist.item.add', { eventId, label: newItem });
              if (data.error) say('Failed: ' + data.error); else { setNewItem(''); load(eventId); }
            }} />
            <button style={btnSmall} onClick={async () => {
              if (!newItem.trim()) return;
              const { data } = await opsPost('checklist.item.add', { eventId, label: newItem });
              if (data.error) say('Failed: ' + data.error); else { setNewItem(''); load(eventId); }
            }}>Add</button>
          </div>
        </div>
      )}
      {!eventId && <div style={{ ...card, fontSize: 13, color: '#666' }}>Pick an event to run its checklist, or edit the master template above.</div>}
    </div>
  );
}
