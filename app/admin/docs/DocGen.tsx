'use client';

// Document Generator UI (phases 1-2: Invoice + Receipt).
//
// Flow: pick type -> fill the schema form -> a debounced /preview call returns
// the server-filled brand-template HTML (with server-computed totals /
// amount-in-words) which renders live in a sandboxed iframe -> Generate
// reserves the real serial (phase 1), the client rasterises the returned HTML
// to PNG (html-to-image) + PDF (jspdf) at the template's exact size, then
// attaches them to the record (phase 2). Recent documents list supports void.
//
// Adding a future doc type: add it to DOC_TYPES + a <Form> branch here; the
// preview/generate/list/void plumbing is type-agnostic.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, th, td, Chip, api } from '../ops/ui';

const VERIFY_BASE = 'https://urbangangtour.co.ke/verify/';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Anton&family=Bungee&family=Permanent+Marker&family=Space+Grotesk:wght@400;500;600;700&display=swap';

type DocType = 'invoice' | 'receipt';
const TYPES: { key: DocType; label: string }[] = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'receipt', label: 'Receipt' },
];

interface LineRow { description: string; qty: string; rate: string }
const emptyRow = (): LineRow => ({ description: '', qty: '', rate: '' });

interface RecentDoc {
  id: string; serial: string; type: string; issued_to: string; event: string;
  status: string; created_at: string; pdf_url: string; void_reason: string;
}

function num(v: string): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtKsh(n: number): string { return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function today(): string { return new Date().toISOString().slice(0, 10); }

export default function DocGen() {
  const [type, setType] = useState<DocType>('invoice');

  // Invoice form
  const [inv, setInv] = useState({
    date: today(), dueDate: '', billTo: '', poNumber: '', eventProject: '',
    discount: '', mpesaTill: '', accountName: '', bankDetails: '',
  });
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  // Receipt form
  const [rct, setRct] = useState({
    date: today(), receivedFrom: '', amountFigures: '', beingPaymentFor: '',
    method: 'M-PESA', transactionRef: '', balanceDue: '', invoiceNo: '', receivedBy: '',
  });

  const [previewHtml, setPreviewHtml] = useState('');
  const [computed, setComputed] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);
  const [result, setResult] = useState<{ serial: string; pdf_url: string; filename: string } | null>(null);
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState<RecentDoc[]>([]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const payload = useMemo(() => {
    if (type === 'invoice') {
      return {
        date: inv.date, dueDate: inv.dueDate, billTo: inv.billTo, poNumber: inv.poNumber,
        eventProject: inv.eventProject, discount: num(inv.discount),
        mpesaTill: inv.mpesaTill, accountName: inv.accountName, bankDetails: inv.bankDetails,
        lineItems: rows
          .filter((r) => r.description || r.qty || r.rate)
          .map((r) => ({ description: r.description, qty: num(r.qty), rate: num(r.rate) })),
      };
    }
    return {
      date: rct.date, receivedFrom: rct.receivedFrom, amountFigures: num(rct.amountFigures),
      beingPaymentFor: rct.beingPaymentFor, method: rct.method, transactionRef: rct.transactionRef,
      balanceDue: rct.balanceDue === '' ? '' : num(rct.balanceDue), invoiceNo: rct.invoiceNo, receivedBy: rct.receivedBy,
    };
  }, [type, inv, rows, rct]);

  // Ensure brand fonts are present in the admin document so the hidden capture
  // node (which is mounted in THIS document, not the iframe) renders correctly.
  useEffect(() => {
    if (!document.querySelector('link[data-docgen-fonts]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONT_HREF; l.setAttribute('data-docgen-fonts', '1');
      document.head.appendChild(l);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    const { data } = await api('/api/admin/docs/list');
    if (data?.rows) setRecent(data.rows);
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Debounced live preview.
  const payloadKey = JSON.stringify({ type, payload });
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      const { status, data } = await api('/api/admin/docs/preview', { method: 'POST', body: JSON.stringify({ type, payload }) });
      if (cancelled) return;
      setBusy(false);
      if (status === 200 && data.html) { setPreviewHtml(data.html); setComputed(data.computed || {}); }
      else if (data?.error) say('Preview: ' + data.error);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [payloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doGenerate() {
    if (gen) return;
    setGen(true); setResult(null);
    try {
      // Phase 1: reserve the real serial + get the filled HTML.
      const r1 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ type, payload }) });
      if (r1.status !== 200 || !r1.data?.html) { say('Generate failed: ' + (r1.data?.error || r1.status)); setGen(false); return; }
      const { id, serial, html, filename } = r1.data;

      // Rasterise the returned HTML's document node.
      const { pngDataUrl, pdfDataUrl } = await rasterise(html);

      // Phase 2: attach the rendered pdf/png to the reserved record.
      const r2 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id, pdfBase64: pdfDataUrl, pngBase64: pngDataUrl }) });
      if (r2.status !== 200 || !r2.data?.pdf_url) { say('Upload failed: ' + (r2.data?.error || r2.status)); setGen(false); return; }

      setResult({ serial, pdf_url: r2.data.pdf_url, filename });
      say('Generated ' + serial);
      loadRecent();
    } catch (e: any) {
      say('Generate error: ' + (e?.message || 'unknown'));
    } finally {
      setGen(false);
    }
  }

  async function voidDoc(serial: string) {
    const reason = window.prompt('Reason for voiding ' + serial + '? (a correction is a new document, never an edit)');
    if (reason === null) return;
    const { status, data } = await api('/api/admin/docs/void', { method: 'POST', body: JSON.stringify({ serial, reason }) });
    if (status === 200) { say('Voided ' + serial); loadRecent(); }
    else say('Void failed: ' + (data?.error || status));
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {toast && <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 60, ...card, padding: '10px 16px', background: '#FFD400' }}>{toast}</div>}

      <div style={card}>
        <h2 style={{ fontFamily: 'Anton', margin: '0 0 4px', fontSize: 22 }}>Document Generator</h2>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>
          Brand-locked, serialised, QR-verifiable documents. Serials and totals are computed by the server, never typed. Finalised documents are immutable - to correct one, void it and generate a new one.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => { setType(t.key); setResult(null); }}
              style={{ ...btn, background: type === t.key ? '#C7238E' : '#fff', color: type === t.key ? '#fff' : '#111' }}>
              {t.label}
            </button>
          ))}
          {/* Future doc types (certificates, call sheet, budget, tickets,
              proposals, promo) slot in here + a Form branch below. */}
          <span style={{ alignSelf: 'center', fontSize: 12, color: '#999' }}>more types coming</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(300px,1.15fr)', gap: 14, alignItems: 'start' }}>
        {/* -------- FORM -------- */}
        <div style={card}>
          <h3 style={h3}>{type === 'invoice' ? 'Invoice details' : 'Receipt details'}</h3>
          {type === 'invoice'
            ? <InvoiceForm inv={inv} setInv={setInv} rows={rows} setRows={setRows} computed={computed} />
            : <ReceiptForm rct={rct} setRct={setRct} computed={computed} />}

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={doGenerate} disabled={gen} style={{ ...btnMagenta, opacity: gen ? 0.6 : 1 }}>
              {gen ? 'Generating...' : 'Generate document'}
            </button>
            {busy && <span style={{ fontSize: 12, color: '#999' }}>updating preview...</span>}
          </div>

          {result && (
            <div style={{ marginTop: 14, border: '2px solid #1F8A5B', borderRadius: 12, padding: 14, background: '#f2fbf6' }}>
              <div style={{ fontFamily: 'Anton', fontSize: 16, color: '#1F8A5B' }}>Generated: {result.serial}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <a href={result.pdf_url} download={result.filename} style={{ ...btn, textDecoration: 'none' }}>Download PDF</a>
                <a href={VERIFY_BASE + result.serial} target="_blank" rel="noreferrer" style={{ ...btnDark, textDecoration: 'none' }}>Open verify page</a>
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 8, wordBreak: 'break-all' }}>
                Verify URL: {VERIFY_BASE + result.serial}
              </div>
            </div>
          )}
        </div>

        {/* -------- LIVE PREVIEW -------- */}
        <div style={card}>
          <h3 style={h3}>Live preview</h3>
          <Preview html={previewHtml} docType={type} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
            Preview uses a provisional serial. The real serial is issued only when you click Generate.
          </div>
        </div>
      </div>

      {/* -------- RECENT -------- */}
      <div style={card}>
        <h3 style={h3}>Recent documents</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr>
              <th style={th}>Serial</th><th style={th}>Type</th><th style={th}>Issued to</th>
              <th style={th}>Date</th><th style={th}>Status</th><th style={th}>Actions</th>
            </tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td style={td} colSpan={6}>No documents yet.</td></tr>}
              {recent.map((d) => (
                <tr key={d.id}>
                  <td style={{ ...td, fontWeight: 700, whiteSpace: 'nowrap' }}>{d.serial}</td>
                  <td style={td}>{d.type}</td>
                  <td style={td}>{d.issued_to || '-'}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{String(d.created_at).slice(0, 10)}</td>
                  <td style={td}>
                    {d.status === 'void'
                      ? <Chip text="VOID" bg="#fdecec" color="#C62828" />
                      : <Chip text="VALID" bg="#e8f6ef" color="#1F8A5B" />}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {d.pdf_url && <a href={d.pdf_url} target="_blank" rel="noreferrer" style={{ ...btnSmall, textDecoration: 'none', marginRight: 6 }}>PDF</a>}
                    <a href={VERIFY_BASE + d.serial} target="_blank" rel="noreferrer" style={{ ...btnSmall, background: '#111', color: '#fff', textDecoration: 'none', marginRight: 6 }}>Verify</a>
                    {d.status !== 'void' && <button onClick={() => voidDoc(d.serial)} style={{ ...btnSmall, background: '#C62828', color: '#fff' }}>Void</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side rasterisation: filled HTML string -> {pngDataUrl, pdfDataUrl}.
// Mounts the [data-doc-page] node off-screen in THIS document, waits for its
// images + brand fonts, snapshots at 2x, wraps into a page-sized PDF.
// ---------------------------------------------------------------------------
async function rasterise(html: string): Promise<{ pngDataUrl: string; pdfDataUrl: string }> {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const page = parsed.querySelector('[data-doc-page]') as HTMLElement | null;
  if (!page) throw new Error('no_doc_page');

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;';
  const node = document.importNode(page, true) as HTMLElement;
  holder.appendChild(node);
  document.body.appendChild(holder);

  try {
    // wait for images (logo, pattern, QR data-url) to decode
    const imgs = Array.from(node.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => (img.complete && img.naturalWidth > 0)
      ? Promise.resolve()
      : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })));
    try { await (document as any).fonts?.ready; } catch { /* fonts optional */ }
    await new Promise((r) => setTimeout(r, 120)); // settle layout/webfonts

    const w = node.offsetWidth || 794;
    const h = node.offsetHeight || 1123;

    const htmlToImage = await import('html-to-image');
    const pngDataUrl = await htmlToImage.toPng(node, { pixelRatio: 2, width: w, height: h, backgroundColor: '#ffffff', cacheBust: true });

    const { jsPDF } = await import('jspdf');
    const mmW = (w * 25.4) / 96;
    const mmH = (h * 25.4) / 96;
    const pdf = new jsPDF({ orientation: mmW > mmH ? 'landscape' : 'portrait', unit: 'mm', format: [mmW, mmH], compress: true });
    pdf.addImage(pngDataUrl, 'PNG', 0, 0, mmW, mmH);
    const pdfDataUrl = pdf.output('datauristring');
    return { pngDataUrl, pdfDataUrl };
  } finally {
    document.body.removeChild(holder);
  }
}

// ---------------------------------------------------------------------------
// Sandboxed, auto-scaled preview iframe.
// ---------------------------------------------------------------------------
function Preview({ html, docType }: { html: string; docType: DocType }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  // template body = doc width 794 + 34px padding each side = 862; height = doc + 68
  const frameW = 862;
  const frameH = docType === 'invoice' ? 1123 + 68 : 430 + 68;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / frameW));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [frameW]);

  return (
    <div ref={wrapRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div style={{ width: frameW * scale, height: frameH * scale, position: 'relative' }}>
        {html
          ? <iframe
              title="preview"
              sandbox="allow-same-origin"
              srcDoc={html}
              style={{ width: frameW, height: frameH, border: '1px solid #eee', borderRadius: 8, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}
            />
          : <div style={{ padding: 24, color: '#999', fontSize: 13 }}>Fill the form to see a live preview.</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
function Field({ lbl, children }: { lbl: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><label style={label}>{lbl}</label>{children}</div>;
}

function InvoiceForm({ inv, setInv, rows, setRows, computed }: any) {
  const set = (k: string) => (e: any) => setInv({ ...inv, [k]: e.target.value });
  const setRow = (i: number, k: keyof LineRow) => (e: any) => {
    const next = rows.slice(); next[i] = { ...next[i], [k]: e.target.value }; setRows(next);
  };
  const addRow = () => { if (rows.length < 7) setRows([...rows, emptyRow()]); };
  const delRow = (i: number) => setRows(rows.length > 1 ? rows.filter((_: any, j: number) => j !== i) : rows);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input type="date" style={inp} value={inv.date} onChange={set('date')} /></Field>
        <Field lbl="Due date"><input type="date" style={inp} value={inv.dueDate} onChange={set('dueDate')} /></Field>
      </div>
      <Field lbl="Bill to"><input style={inp} value={inv.billTo} onChange={set('billTo')} placeholder="Client / school name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="P.O. (if any)"><input style={inp} value={inv.poNumber} onChange={set('poNumber')} /></Field>
        <Field lbl="Event / project"><input style={inp} value={inv.eventProject} onChange={set('eventProject')} /></Field>
      </div>

      <label style={label}>Line items (max 7)</label>
      <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
        {rows.map((r: LineRow, i: number) => {
          const amt = num(r.qty) * num(r.rate);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 54px 84px 84px 28px', gap: 6, alignItems: 'center' }}>
              <input style={{ ...inp, padding: '7px 9px' }} placeholder="Description" value={r.description} onChange={setRow(i, 'description')} />
              <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Qty" value={r.qty} onChange={setRow(i, 'qty')} />
              <input style={{ ...inp, padding: '7px 9px' }} type="number" min={0} placeholder="Rate" value={r.rate} onChange={setRow(i, 'rate')} />
              <div style={{ fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#555' }}>{amt ? fmtKsh(amt) : '-'}</div>
              <button onClick={() => delRow(i)} title="Remove" style={{ ...btnSmall, background: '#eee', padding: '5px 7px' }}>x</button>
            </div>
          );
        })}
      </div>
      <button onClick={addRow} disabled={rows.length >= 7} style={{ ...btnSmall, opacity: rows.length >= 7 ? 0.5 : 1 }}>+ Add line</button>

      <Field lbl="Discount (KSH)"><input style={inp} type="number" min={0} value={inv.discount} onChange={set('discount')} placeholder="0" /></Field>

      <div style={{ background: '#faf7f0', border: '2px solid #111', borderRadius: 10, padding: 10, margin: '4px 0 10px', fontSize: 13 }}>
        <Line k="Subtotal" v={'KSH ' + fmtKsh(computed?.subtotal || 0)} />
        <Line k="Discount" v={'KSH ' + fmtKsh(computed?.discount || 0)} />
        <Line k="Total" v={'KSH ' + fmtKsh(computed?.total || 0)} bold />
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Computed by the server - authoritative.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="M-PESA Till / Paybill"><input style={inp} value={inv.mpesaTill} onChange={set('mpesaTill')} /></Field>
        <Field lbl="Account name"><input style={inp} value={inv.accountName} onChange={set('accountName')} /></Field>
      </div>
      <Field lbl="Bank / branch / acc no."><input style={inp} value={inv.bankDetails} onChange={set('bankDetails')} /></Field>
    </div>
  );
}

function ReceiptForm({ rct, setRct, computed }: any) {
  const set = (k: string) => (e: any) => setRct({ ...rct, [k]: e.target.value });
  const methods = ['M-PESA', 'Bank', 'Cash'];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Date"><input type="date" style={inp} value={rct.date} onChange={set('date')} /></Field>
        <Field lbl="Received from"><input style={inp} value={rct.receivedFrom} onChange={set('receivedFrom')} placeholder="Payer name" /></Field>
      </div>
      <Field lbl="Amount (KSH figures)"><input style={inp} type="number" min={0} value={rct.amountFigures} onChange={set('amountFigures')} placeholder="Amount in KSH" /></Field>
      <div style={{ background: '#faf7f0', border: '2px solid #111', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#555' }}>Amount in words (auto)</div>
        <div style={{ fontWeight: 700, marginTop: 3 }}>{computed?.amountWords || '-'}</div>
      </div>
      <Field lbl="Being payment for"><input style={inp} value={rct.beingPaymentFor} onChange={set('beingPaymentFor')} placeholder="What this payment is for" /></Field>
      <label style={label}>Method</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {methods.map((m) => (
          <button key={m} onClick={() => setRct({ ...rct, method: m })}
            style={{ ...btnSmall, background: rct.method === m ? '#E6218C' : '#fff', color: rct.method === m ? '#fff' : '#111' }}>{m}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Transaction ref"><input style={inp} value={rct.transactionRef} onChange={set('transactionRef')} /></Field>
        <Field lbl="Balance due (if any)"><input style={inp} type="number" min={0} value={rct.balanceDue} onChange={set('balanceDue')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Invoice no. (if any)"><input style={inp} value={rct.invoiceNo} onChange={set('invoiceNo')} /></Field>
        <Field lbl="Received by"><input style={inp} value={rct.receivedBy} onChange={set('receivedBy')} /></Field>
      </div>
    </div>
  );
}

function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontWeight: bold ? 800 : 500, fontSize: bold ? 15 : 13 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  );
}
