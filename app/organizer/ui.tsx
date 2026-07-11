'use client';

// Shared styling for the organizer portal. On-brand (charcoal/magenta/gold,
// Anton headings) but visually distinct from both the public v25 site and
// the admin Control Room — this is a third-party business tool, not a fan
// page. Mobile-first, same hard-border/hard-shadow language as the ops suite.

import { useState } from 'react';

export const OC = { magenta: '#E6218C', gold: '#FFD400', charcoal: '#111', grey: '#666', green: '#1F8A5B', red: '#C0392B' };

export const shell: React.CSSProperties = { minHeight: '100vh', background: '#0c0c0c', padding: '40px 18px 80px', fontFamily: "'Space Grotesk', system-ui, sans-serif" };
export const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto' };
export const card: React.CSSProperties = { background: '#fff', border: '3px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111', padding: 20 };
export const btn: React.CSSProperties = { background: OC.gold, color: '#111', fontWeight: 800, fontSize: 14, padding: '11px 18px', border: '2px solid #111', borderRadius: 10, boxShadow: '3px 3px 0 #111', cursor: 'pointer' };
export const btnMagenta: React.CSSProperties = { ...btn, background: OC.magenta, color: '#fff' };
export const btnDark: React.CSSProperties = { ...btn, background: '#111', color: '#fff' };
export const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '2px solid #111', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' };
export const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#555', display: 'block', marginBottom: 4 };
export const h1: React.CSSProperties = { fontFamily: 'Anton', fontSize: 30, color: '#fff', margin: '0 0 6px', textTransform: 'uppercase' };
export const h3: React.CSSProperties = { fontFamily: 'Anton', margin: '0 0 10px', fontSize: 18 };

export function Chip({ text, bg, color }: { text: string; bg?: string; color?: string }) {
  return <span style={{ background: bg || '#eee', color: color || '#333', borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-block' }}>{text}</span>;
}

export const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#FDF2D9', color: '#D97706' },
  pending_review: { bg: '#FDF2D9', color: '#D97706' },
  draft: { bg: '#eee', color: '#555' },
  approved: { bg: '#E7F5EE', color: OC.green },
  published: { bg: '#E7F5EE', color: OC.green },
  rejected: { bg: '#FBE7E7', color: OC.red },
  cancelled: { bg: '#FBE7E7', color: OC.red },
  suspended: { bg: '#FBE7E7', color: OC.red },
  completed: { bg: '#eee', color: '#555' },
};

export async function api(path: string, opts?: RequestInit) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

export function useToast(): [string, (m: string) => void] {
  const [msg, setMsg] = useState('');
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  return [msg, say];
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, ...card, padding: '10px 16px', background: OC.gold, maxWidth: 320 }}>{msg}</div>;
}

export function fmtKES(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'KES 0';
  return 'KES ' + Math.round(Number(n)).toLocaleString('en-KE');
}
