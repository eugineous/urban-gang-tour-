'use client';

import { useEffect, useState } from 'react';

// Compact share pills for article pages. Pure client-side link building from
// the article's canonical URL — no tracking, no SDKs. Native share (when the
// device supports navigator.share) is listed first.

const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  minHeight: 44,
  padding: '8px 16px',
  background: '#fff',
  border: '2px solid #111',
  borderRadius: 100,
  boxShadow: '3px 3px 0 #111',
  color: '#111',
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontWeight: 700,
  fontSize: 13,
  textDecoration: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function Ic({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function ShareBar({ url, title }: { url: string; title: string }) {
  const [canNative, setCanNative] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') setCanNative(true);
  }, []);

  const eu = encodeURIComponent(url);
  const et = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked - the visible URL bar still works */ }
  };

  const nativeShare = () => {
    navigator.share({ title, url }).catch(() => { /* user dismissed */ });
  };

  return (
    <div aria-label="Share this story" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0 4px' }}>
      {canNative && (
        <button type="button" style={{ ...pill, background: '#FFD400' }} onClick={nativeShare}>
          <Ic d="M4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7M12 15V3.5M8 7l4-3.5L16 7" />
          Share
        </button>
      )}
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${eu}`} target="_blank" rel="noopener" style={pill}>
        <Ic d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        Facebook
      </a>
      <a href={`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`} target="_blank" rel="noopener" style={pill}>
        <Ic d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3ZM8.7 8.5c.7-.2 1 .1 1.3.8.3.7.5 1 .2 1.4l-.5.6c.3.8 1.5 2 2.4 2.4l.7-.5c.4-.3.7-.1 1.3.2.7.3 1 .6.8 1.3-.2.7-1.3 1.2-2 1-2-.4-4.6-3-5.1-5.1-.2-.7.3-1.9 1-2.1Z" />
        WhatsApp
      </a>
      <a href={`https://twitter.com/intent/tweet?text=${et}&url=${eu}`} target="_blank" rel="noopener" style={pill}>
        <Ic d="M4 4l16 16M20 4L4 20" />
        Post
      </a>
      <button type="button" style={{ ...pill, background: copied ? '#111' : '#fff', color: copied ? '#FFD400' : '#111' }} onClick={copy}>
        <Ic d={copied ? 'M4.5 12.5 10 18 19.5 6.5' : 'M9 9h10.5v10.5H9zM6 15H4.5V4.5H15V6'} />
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
