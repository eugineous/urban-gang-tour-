'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {getGateAccess,verifyGateTicket,type GateVerdict} from '@/lib/client/gate-verification';

// Full-screen camera gate scanner. Auth: probes an admin endpoint; a 401
// sends staff to /admin to sign in (same ugt_admin cookie session). Decoding
// runs fully on-device (getUserMedia + canvas + jsQR - no external CDN); each
// decoded code hits POST /api/tickets/verify which flips used_at atomically.

const CODE_RE = /TKT-(?:[A-HJ-NP-Z2-9]{22}-[A-HJ-NP-Z2-9]{12}|[A-HJ-NP-Z2-9]{10}-[A-HJ-NP-Z2-9]{4})/i;

const C = { pink: '#E6218C', yellow: '#FFD400', cyan: '#21C7E6', green: '#1F8A5B', red: '#C62828' };

export default function GateApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Distinguishes "not signed in at all" from "signed in but this account
  // has no gate_scanner perm" - both render the same non-camera screen, but
  // with a different message so crew staff know whether to sign in or ask
  // the owner to grant them the perm (see app/api/admin/accounts).
  const [permDenied, setPermDenied] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [verdict, setVerdict] = useState<GateVerdict | null>(null);
  const [accessError,setAccessError]=useState(false);
  const [online,setOnline]=useState(true);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [lastCode,setLastCode]=useState('');
  const [holderContact,setHolderContact]=useState<{holder:string;email:string;phone:string}|null>(null);
  const [contactNotice,setContactNotice]=useState('');
  const [scans, setScans] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const resumeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef=useRef<AbortController|null>(null);

  // Auth probe - same ugt_admin session as the Control Room, but gate
  // scanning additionally requires the 'gate_scanner' perm (super_admin
  // always has it; a crew_admin needs it explicitly granted). This is a UX
  // check only - the real gate is POST /api/tickets/verify's own
  // hasPerm(req,'gate_scanner') check, which fails closed regardless of
  // what this probe says.
  const probeAccess=useCallback(async()=>{
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;
    setAuthed(null);setAccessError(false);
    const access=await getGateAccess(controller.signal);if(controller.signal.aborted)return;
    setAccessError(access.result==='unverified');setPermDenied(access.result==='forbidden');setAuthed(access.result==='allowed');
  },[]);
  useEffect(()=>{void probeAccess();return()=>requestRef.current?.abort()},[probeAccess]);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();addEventListener('online',update);addEventListener('offline',update);return()=>{removeEventListener('online',update);removeEventListener('offline',update)}},[]);

  const submitCode = useCallback(async (code: string,retry=false) => {
    if (pausedRef.current&&!retry) return;
    pausedRef.current = true;
    setBusy(true);
    setLastCode(code);setHolderContact(null);setContactNotice('');
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;
    const reply=navigator.onLine?await verifyGateTicket(code,controller.signal):{result:'unverified' as const,reason:'offline' as const};
    if(controller.signal.aborted)return;
    setBusy(false);
    if(reply.result==='signed_out'||reply.result==='forbidden'){setPermDenied(reply.result==='forbidden');setAccessError(false);setAuthed(false);pausedRef.current=false;return}
    const v=reply;
    setVerdict(v);
    if(v.result!=='unverified')setScans((n) => n + 1);
    try { navigator.vibrate?.(v.result === 'valid' ? [90] : [70, 60, 70]); } catch { /* no haptics */ }
    if (resumeT.current) clearTimeout(resumeT.current);
    // Unknown outcomes remain paused for an explicit staff decision. A retry
    // may report already-used if the original server write actually committed.
    if(v.result==='unverified')return;
    resumeT.current = setTimeout(() => {
      setVerdict(null);
      pausedRef.current = false;
    }, 2500);
  }, []);

  const onDecoded = useCallback((text: string) => {
    // accept a full /t/<code> URL or a bare code
    const m = String(text || '').match(CODE_RE);
    if (m&&navigator.onLine) void submitCode(m[0].toUpperCase());
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

  const headingFont = 'Inter,system-ui,sans-serif';
  const wrap: React.CSSProperties = {
    // z above the site chrome (cookie banner 10000, boot veil 9999) - gate
    // staff must never have the scanner blocked by a consent popup
    position: 'fixed', inset: 0, zIndex: 12000, background: '#0c0c0c', color: '#fff',
    fontFamily: 'inherit', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };

  if (authed === null) {
    return <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center' }}>Checking access...</div>;
  }
  if (!authed) {
    return (
      <div style={{ ...wrap, alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ height: 60, marginBottom: 14 }} />
        <div style={{ fontFamily: headingFont, fontSize: 26, textTransform: 'uppercase' }}>Gate Scanner</div>
        <p style={{ color: '#9a9aa4', fontSize: 13.5, lineHeight: 1.6, maxWidth: 300 }}>
          {accessError?'The access check is unavailable. Your session may still be valid. Retry when the connection is restored.':permDenied
            ? "Signed in, but this account isn't authorised for gate scanning. Ask the owner to grant the gate_scanner module in Admins."
            : 'Staff only. Sign in to the Control Room first, then come back here.'}
        </p>
        {accessError&&<button type="button" onClick={()=>void probeAccess()} style={{background:C.pink,color:'#fff',minHeight:44,padding:'12px 20px',border:0,borderRadius:12,marginBottom:16}}>Retry access check</button>}
        <a href="/admin" style={{ background: C.yellow, color: '#111', fontFamily: headingFont, fontSize: 16, textDecoration: 'none', padding: '13px 26px', border: '1px solid #ddd', borderRadius: 12, boxShadow: '5px 5px 0 rgba(230,33,140,.5)', textTransform: 'uppercase' }}>
          {permDenied ? 'Back to /admin' : 'Sign in at /admin'}
        </a>
      </div>
    );
  }

  const verdictBg = verdict?.result === 'valid' ? C.green : verdict?.result==='unverified'?'#28344a':C.red;

  return (
    <div style={wrap}>
      {/* camera layer */}
      <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: camErr ? 0 : 1 }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* top bar */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', background: 'linear-gradient(180deg, rgba(12,12,12,.9), rgba(12,12,12,0))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uploads/URBAN%20GANG%20TOUR%20OFFICIAL%20LOGO.png" alt="Urban Gang Tour" style={{ height: 32 }} />
          <div>
            <div style={{ fontFamily: headingFont, fontSize: 16, lineHeight: 1, textTransform: 'uppercase' }}>Gate Scanner</div>
            <div style={{ fontSize: 12, color: '#fff',marginTop:6 }}>Verified checks: {scans}</div>
          </div>
        </div>
        <a href="/admin" style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textDecoration: 'none', border: '2px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '7px 12px' }}>CONTROL ROOM</a>
      </div>
      <p role="status" style={{position:'relative',zIndex:3,margin:'0 16px',padding:'8px 0',fontSize:13,color:online?'#ddd':'#fff'}}>{online?'Online verification required for admission.':'No connection. Restore internet or use the staffed exception lane.'}</p>

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
            value={manual} aria-label="Ticket code" maxLength={600}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type code: TKT-XXXXXXXXXX-XXXX"
            autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            style={{ flex: 1,minWidth:0, padding: '12px 14px', borderRadius: 12, border: '2px solid rgba(255,255,255,.35)', background: 'rgba(17,17,17,.85)', color: '#fff', fontFamily: "ui-monospace,'Courier New',monospace", fontSize: 16, letterSpacing: '.02em' }}
          />
          <button type="submit" disabled={busy||!online} style={{ background: C.pink, color: '#fff',minHeight:44,fontFamily: headingFont, fontSize: 14, padding: '0 18px', border: '1px solid #ddd', borderRadius: 12, cursor: 'pointer', textTransform: 'uppercase' }}>Check</button>
        </form>
        {lastCode&&<details style={{maxWidth:440,margin:'12px auto',color:'#fff'}}><summary>Private holder contact lookup</summary><p style={{fontSize:13}}>For authorised event operations or safety only. Access is logged.</p><button onClick={async()=>{setContactNotice('Looking up…');try{const r=await fetch('/api/admin/tickets/'+encodeURIComponent(lastCode)+'/holder',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error();setHolderContact(d.holder);setContactNotice('')}catch{setContactNotice('Contact lookup unavailable.')}}}>View holder contacts</button>{holderContact&&<div><p>{holderContact.holder}</p><p>{holderContact.email||'No email supplied'}</p><p>{holderContact.phone||'No phone supplied'}</p><button onClick={()=>setHolderContact(null)}>Hide contacts</button></div>}<p role="status">{contactNotice}</p></details>}

      </div>

      {/* verdict overlay */}
      {verdict ? (
        <div role="status" aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 10, background: verdictBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',overflowY:'auto',overflowWrap:'anywhere' }}>
          <h1 style={{ fontFamily: headingFont, fontSize: 'clamp(28px, 8vw, 44px)', lineHeight: 1.2,margin:0 }}>
            {verdict.result === 'valid' ? 'Valid ticket' : verdict.result === 'used' ? 'Already used' : verdict.result==='unverified'?'Check-in not confirmed':'Invalid ticket'}
          </h1>
          {'ticket' in verdict ? (
            <div style={{ marginTop: 18, background: 'rgba(0,0,0,.3)', border: '2px solid rgba(255,255,255,.5)', borderRadius: 14, padding: '14px 20px', fontSize: 15, lineHeight: 1.7, maxWidth: 340 }}>
              <div style={{ fontFamily: headingFont, fontSize: 19, textTransform: 'uppercase' }}>{verdict.ticket.event}</div>
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
                : verdict.reason === 'ticket_voided' ? 'This ticket has been voided. Ask the supervisor to review the order.'
                : 'Not a real Urban Gang Tour ticket.'}
            </div>
          ) : null}
          {verdict.result==='unverified'?<>
            <p style={{maxWidth:360,lineHeight:1.6}}>{verdict.reason==='rate_limited'?'This scanner is temporarily rate limited.':verdict.reason==='timeout'?'The check timed out.':verdict.reason==='offline'?'The device is offline.':'A reliable result could not be received.'} The server may already have recorded this scan. This message does not authorize admission.</p>
            <p style={{maxWidth:360,lineHeight:1.6}}>Retry the check, or move the attendee to the staffed exception lane. An “already used” reply may be the original check-in; ask the supervisor to review it before admitting anyone again.</p>
            <button type="button" disabled={busy||!online} onClick={()=>void submitCode(lastCode,true)} style={{minHeight:44,padding:'12px 24px',background:'#fff',color:'#172030',border:0,borderRadius:12,font:'inherit'}}>{busy?'Checking…':'Retry check'}</button>
            <button type="button" disabled={busy} onClick={()=>{setVerdict(null);pausedRef.current=false}} style={{minHeight:44,padding:'12px 24px',background:'transparent',color:'#fff',border:'1px solid #fff',borderRadius:12,font:'inherit',marginTop:12}}>Set aside and continue</button>
          </>:<div style={{ marginTop: 22, fontSize: 11, letterSpacing: '.2em', opacity: .85 }}>SCANNING AGAIN IN A MOMENT...</div>}
        </div>
      ) : null}
    </div>
  );
}
