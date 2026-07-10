'use client';

import { useEffect, useState } from 'react';

// Floating WhatsApp chat button. Number is set by the admin in Control Room →
// Comms; if none is configured the widget renders nothing.
export function WhatsAppWidget() {
  const [num, setNum] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/site-info').then((r) => r.json()).then((d) => setNum(d.whatsapp || null)).catch(() => {});
  }, []);
  if (!num) return null;
  return (
    <a
      href={`https://wa.me/${num}?text=${encodeURIComponent('Habari Urban Gang! ')}`}
      target="_blank"
      rel="noopener"
      aria-label="Chat with us on WhatsApp"
      className="wa-fab"
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 500,
        width: 56, height: 56, borderRadius: 16,
        background: '#25D366', border: '3px solid #111', boxShadow: '4px 4px 0 #111',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .8-.3 1.3z" />
      </svg>
    </a>
  );
}
