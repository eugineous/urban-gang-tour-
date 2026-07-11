'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

// Full-screen camera gate scanner. Auth: probes an admin endpoint; a 401
// sends staff to /admin to sign in (same ugt_admin cookie session). Decoding
// runs fully on-device (getUserMedia + canvas + jsQR - no external CDN); each
// decoded code hits POST /api/tickets/verify which flips used_at atomically.

const CODE_RE = /TKT-[A-HJ-NP-Z2-9]{10}-[A-HJ-NP-Z2-9]{4}/i;

type Verdict = {
  result: 'valid' | 'used' | 'invalid';
  reason?: string;
  usedAt?: string;
  ticket?: { event: string; eventDate: string; tier: string; holder: string; position: number; ofCount: number };
};

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6', green: '#1F8A5B', red: '#C62828' };

export default function GateApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Distinguishes "not signed in at all" from "signed in but this account
  // has no gate_scanner perm" - both render the same non-camera screen, but
  // with a different message so crew staff know whether to sign in or ask
  // the owner to grant them the perm (see app/api/admin/accounts).
  const [permDenied, setPermDenied] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [scans, setScans] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const resumeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth probe - same ugt_admin session as the Control Room, but gate
  // scanning additionally requires the 'gate_scanner' perm (super_admin
  // always has it; a crew_admin needs it explicitly granted). This is a UX
  // check only - the real gate is POST /api/tickets/verify's own
  // hasPerm(req,'gate_scanner') check, which fails closed regardless of
  // what this probe says.
  useEffect(() => {
    fetch('/api/admin/me')
      .then(async (r) => {
        if (r.status === 401) { setAuthed(false); return; }
        const data = await r.json().catch(() => ({}));
        const ok = data.scope === 'super_admin' || (Array.isArray(data.perms) && data.perms.includes('gate_scanner'));
        setPermDenied(!ok);
        setAuthed(ok);
      })
      .catch(() => setAuthed(false));
  }, []);

  const submitCode = useCallback(async (code: string) => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setBusy(true);
    let v: Verdict = { result: 'invalid', reason: 'network' };
    try {
      const r = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { setAuthed(false); return; }
      if (r.status === 403) { setPermDenied(true); setAuthed(false); return; }
      if (d && d.result) v = d as Verdict;
    } catch { /* network verdict already set */ }
    setBusy(false);
    setVerdict(v);
    setScans((n) => n + 1);
    try { navigator.vibrate?.(v.result === 'valid' ? [90] : [70, 60, 70]); } catch { /* no haptics */ }
    if (resumeT.current) clearTimeout(resumeT.current);
    resumeT.current = setTimeout(() => {
      setVerdict(null);
      pausedRef.current = false;
    }, 2500);
  }, []);

  const onDecoded = useCallback((text: string) => {
    // accept a full /t/<code> URL or a bare code
    const m = String(text || '').match(CODE_RE);
    if (m) void submitCode(m[0].toUpperCase());
  }, [submitCode]);

  // camera + jsQR loop
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const tick = () => {
          if (cancelled) return;
          rafRef.current = requestAnimationFrame(tick);
          if (pausedRef.current || !video.videoWidth) return;
          // sample the centre square of the frame (matches the scan box)
          const side = Math.min(video.videoWidth, video.videoHeight);
          const sx = (video.videoWidth - side) / 2;
          const sy = (video.videoHeight - side) / 2;
          const size = 480;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
          const img = ctx.getImageData(0, 0, size, size);
          const hit = jsQR(img.data, size, size, { inversionAttempts: 'dontInvert' });
          if (hit?.data) onDecoded(hit.data);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setCamErr('Camera unavailable. Allow camera access, or type the code below.');
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (resumeT.current) clearTimeout(resumeT.current);
    };
  }, [authed, onDecoded]);

  const anton = "'Anton','Arial Black',sans-serif";
  const wrap: React.CSSProperties = {
    // z above the site chrome (cookie banner 10000, boot veil 9999) - gate
    // staff must never have the scanner blocked by a consent popup
    position: 'fixed', inset: 0, zIndex: 12000, background: '#0c0c0c', color: '#fff',
    fontFamily: "'Space Grotesk',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  if (authed === null) {
    return <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center' }}>Checking access...</div>;
  }
  if (!authed) {
    return (
      <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/ugt-logo-v2.png" alt="" style={{ height: 60, marginBottom: 14 }} />
        <div style={{ fontFamily: anton, fontSize: 26, textTransform: 'uppercase' }}>Gate Scanner</div>
        <p style={{ color: '#9a9aa4', fontSize: 13.5, lineHeight: 1.6, maxWidth: 300 }}>
          {permDenied
            ? "Signed in, but this account isn't authorised for gate scanning. Ask the owner to grant the gate_scanner module in Admins."
            : 'Staff only. Sign in to the Control Room first, then come back here.'}
        </p>
        <a href="/admin" style={{ background: C.yellow, color: '#111', fontFamily: anton, fontSize: 16, textDecoration: 'none', padding: '13px 26px', border: '3px solid #111', borderRadius: 12, boxShadow: '5px 5px 0 rgba(230,33,140,.5)', textTransform: 'uppercase' }}>
          {permDenied ? 'Back to /admin' : 'Sign in at /admin'}
        </a>
      </div>
    );
  }

  const verdictBg = verdict?.result === 'valid' ? C.green : C.red;

  return (
    <div style={wrap}>
      {/* camera layer */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: camErr ? 0 : 1 }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: 'linear-gradient(180deg, rgba(12,12,12,.9), rgba(12,12,12,0))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/ugt-logo-v2.png" alt="" style={{ height: 32 }} />
          <div>
            <div style={{ fontFamily: anton, fontSize: 16, lineHeight: 1, textTransform: 'uppercase' }}>Gate Scanner</div>
            <div style={{ fontSize: 10, letterSpacing: '.18em', color: C.yellow }}>SCANS: {scans}</div>
          </div>
        </div>
        <a href="/admin" style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textDecoration: 'none', border: '2px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '7px 12px' }}>CONTROL ROOM</a>
      </div>

      {/* scan box overlay */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {camErr ? (
          <div style={{ maxWidth: 300, textAlign: 'center', color: '#ddd', fontSize: 14, lineHeight: 1.6, padding: 20, border: '2px dashed rgba(255,255,255,.3)', borderRadius: 14 }}>{camErr}</div>
        ) : (
          <div style={{ position: 'relative', width: 'min(68vw, 300px)', aspectRatio: '1' }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{
                position: 'absolute', width: 34, height: 34,
                [i % 2 === 0 ? 'left' : 'right']: -3, [i < 2 ? 'top' : 'bottom']: -3,
                borderStyle: 'solid', borderColor: C.yellow,
                borderWidth: `${i < 2 ? 4 : 0}px ${i % 2 === 1 ? 4 : 0}px ${i >= 2 ? 4 : 0}px ${i % 2 === 0 ? 4 : 0}px`,
                borderRadius: 4,
              } as React.CSSProperties} />
            ))}
            <div style={{ position: 'absolute', left: '50%', bottom: -34, transform: 'translateX(-50%)', fontSize: 11, letterSpacing: '.22em', color: '#eee', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {busy ? 'CHECKING...' : 'POINT AT THE TICKET QR'}
            </div>
          </div>
        )}
      </div>

      {/* manual entry */}
      <div style={{ position: 'relative', zIndex: 3, padding: '10px 16px 18px', background: 'linear-gradient(0deg, rgba(12,12,12,.92), rgba(12,12,12,0))' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); const m = manual.match(CODE_RE); if (m) { void submitCode(m[0].toUpperCase()); setManual(''); } }}
          style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type code: TKT-XXXXXXXXXX-XXXX"
            autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 12, border: '2px solid rgba(255,255,255,.35)', background: 'rgba(17,17,17,.85)', color: '#fff', fontFamily: "ui-monospace,'Courier New',monospace", fontSize: 13, letterSpacing: '.08em' }}
          />
          <button type="submit" style={{ background: C.yellow, color: '#111', fontFamily: anton, fontSize: 14, padding: '0 18px', border: '2px solid #111', borderRadius: 12, cursor: 'pointer', textTransform: 'uppercase' }}>Check</button>
        </form>
      </div>

      {/* verdict overlay */}
      {verdict ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: verdictBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ fontFamily: anton, fontSize: 'clamp(44px, 14vw, 72px)', lineHeight: 1, textTransform: 'uppercase', textShadow: '4px 4px 0 rgba(0,0,0,.35)' }}>
            {verdict.result === 'valid' ? 'VALID' : verdict.result === 'used' ? 'ALREADY USED' : 'INVALID'}
          </div>
          {verdict.ticket ? (
            <div style={{ marginTop: 18, background: 'rgba(0,0,0,.3)', border: '2px solid rgba(255,255,255,.5)', borderRadius: 14, padding: '14px 20px', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
              <div style={{ fontFamily: anton, fontSize: 19, textTransform: 'uppercase' }}>{verdict.ticket.event}</div>
              <div><b>{verdict.ticket.tier}</b> &middot; {verdict.ticket.position} of {verdict.ticket.ofCount}</div>
              {verdict.ticket.holder ? <div>{verdict.ticket.holder}</div> : null}
              {verdict.result === 'used' && verdict.usedAt ? (
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  Admitted {new Date(verdict.usedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })} EAT
                </div>
              ) : null}
            </div>
          ) : verdict.result === 'invalid' ? (
            <div style={{ marginTop: 14, fontSize: 15, fontWeight: 700, opacity: .95 }}>
              {verdict.reason === 'order_not_paid' ? 'Ticket exists but the order is not paid.'
                : verdict.reason === 'network' ? 'Network error - try again.'
                : 'Not a real Urban Gang Tour ticket.'}
            </div>
          ) : null}
          <div style={{ marginTop: 22, fontSize: 11, letterSpacing: '.2em', opacity: .85 }}>SCANNING AGAIN IN A MOMENT...</div>
        </div>
      ) : null}
    </div>
  );
}
