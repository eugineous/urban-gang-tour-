'use client';
import {fetchWithTimeout} from '@/lib/client/fetch-with-timeout';

// Shared styling for the organizer portal. On-brand (charcoal/magenta/gold,
// Readable headings) in the shared current interface and
// the admin Control Room — this is a third-party business tool, not a fan
// page. Mobile-first, same hard-border/hard-shadow language as the ops suite.

import { useState } from 'react';

export const OC = { magenta: '#ad1264', gold: '#FFD400', charcoal: '#111', grey: '#666', green: '#1F8A5B', red: '#C0392B' };

export const shell: React.CSSProperties = { minHeight: '100vh', background: '#f5f4f0', padding: '140px 20px 80px', fontFamily: "Inter, system-ui, sans-serif" };
export const wrap: React.CSSProperties = { maxWidth: 720, margin: '0 auto' };
export const card: React.CSSProperties = { background: '#fff', border: '1px solid #ddd9d6', borderRadius: 16, padding: 20 };
export const btn: React.CSSProperties = { background: '#111', color: '#fff', fontWeight: 600, fontSize: 16, minHeight: 48, padding: '12px 20px', border: '1px solid #111', borderRadius: 10, cursor: 'pointer' };
export const btnMagenta: React.CSSProperties = { ...btn, background: OC.magenta, color: '#fff' };
export const btnDark: React.CSSProperties = { ...btn, background: '#111', color: '#fff' };
export const inp: React.CSSProperties = { width: '100%', padding: '12px', minHeight: 48, border: '1px solid #aaa', borderRadius: 10, fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box' };
export const label: React.CSSProperties = { fontSize: 14, fontWeight: 600, letterSpacing: '.04em', color: '#555', display: 'block', marginBottom: 4 };
export const h1: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 38, color: '#161616', margin: '0 0 12px', letterSpacing: '-.04em' };
export const h3: React.CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif', margin: '0 0 12px', fontSize: 22 };

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
  try {
    const r = await fetchWithTimeout(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const data = await r.json().catch(() => ({ error: 'Invalid server response. Please try again.' }));
    return { status: r.status, data: r.ok ? data : { ...data, ok: false, error: data.error || 'Service unavailable. Please try again.' } };
  } catch {
    return { status: 0, data: { ok: false, error: 'Connection failed. Please try again.' } };
  }
}

export function useToast(): [string, (m: string) => void] {
  const [msg, setMsg] = useState('');
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  return [msg, say];
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div role="alert" style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, ...card, padding: '10px 16px', background: OC.gold, maxWidth: 320 }}>{msg}</div>;
}

export function organizerAccessMessage(error: unknown): string {
  if (error === 'account_not_active')
    return 'This organizer account is no longer active. Contact the Urban Gang Tour Marketplace team if you believe this is a mistake.';
  if (error === 'db_not_configured')
    return 'The organizer portal is temporarily unavailable. Please try again later.';
  return 'Your session has ended. Please log in again.';
}

export function fmtKES(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 'KES 0';
  return 'KES ' + Math.round(Number(n)).toLocaleString('en-KE');
}
