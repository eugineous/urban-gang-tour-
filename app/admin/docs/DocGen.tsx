'use client';

// Document Generator UI (Invoice + Receipt + Winner/Participation certs).
//
// Flow: pick type -> fill the schema form -> a debounced /preview call returns
// the server-filled brand-template HTML (with server-computed totals /
// amount-in-words) which renders live in a sandboxed iframe -> Generate
// reserves the real serial (phase 1), the client rasterises the returned HTML
// to PNG (html-to-image) + PDF (jspdf) at the template's exact size, then
// attaches them to the record (phase 2). Recent documents list supports void.
//
// Certificates add a CSV BATCH mode: upload a .csv (one row per certificate),
// preview the parsed rows, then Generate All -> the server reserves one serial
// per row in a single all-or-nothing call (/batch), the client rasterises +
// attaches each, and offers one ZIP of every PDF. Serials stay gapless: a bad
// row rejects the whole batch and reserves nothing.
//
// Adding a future doc type: add it to DOC_TYPES + a <Form> branch here; the
// preview/generate/list/void plumbing is type-agnostic.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { card, btn, btnDark, btnMagenta, btnSmall, inp, label, h3, th, td, Chip, api } from '../ops/ui';

const VERIFY_BASE = 'https://urbangangtour.co.ke/verify/';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Anton&family=Bungee&family=Permanent+Marker&family=Space+Grotesk:wght@400;500;600;700&display=swap';

type DocType = 'invoice' | 'receipt' | 'certw' | 'certp';
const TYPES: { key: DocType; label: string }[] = [
  { key: 'invoice', label: 'Invoice' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'certw', label: 'Winner Certificate' },
  { key: 'certp', label: 'Participation Certificate' },
];
const isCertType = (t: DocType) => t === 'certw' || t === 'certp';

// Doc page dimensions (px) - drives the live-preview iframe sizing. Body
// padding is 34px each side (see the templates' <body>), so the frame adds 68.
const DIMS: Record<DocType, { w: number; h: number }> = {
  invoice: { w: 794, h: 1123 },
  receipt: { w: 794, h: 430 },
  certw: { w: 1123, h: 794 },
  certp: { w: 1123, h: 794 },
};

// CSV column schema per certificate type (also the accepted header names).
const CSV_FIELDS: Record<'certw' | 'certp', string[]> = {
  certw: ['recipientName', 'category', 'stopName', 'eventDate'],
  certp: ['participantName', 'podName', 'stopName'],
};

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
  const [mode, setMode] = useState<'single' | 'batch'>('single');

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

  // Winner certificate form
  const [cw, setCw] = useState({ recipientName: '', category: '', stopName: '', eventDate: today() });
  // Participation certificate form
  const [cp, setCp] = useState({ participantName: '', podName: '', stopName: '' });

  // CSV batch state
  const [csvName, setCsvName] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvError, setCsvError] = useState('');
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [batchResult, setBatchResult] = useState<{ serials?: string[]; zipUrl?: string; zipName?: string; error?: string } | null>(null);

  const [previewHtml, setPreviewHtml] = useState('');
  const [computed, setComputed] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);
  const [result, setResult] = useState<{ serial: string; pdf_url: string; filename: string } | null>(null);
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState<RecentDoc[]>([]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const batchMode = isCertType(type) && mode === 'batch';

  // The single-form payload for this type (preview + single Generate).
  const singlePayload = useMemo(() => {
    if (type === 'invoice') {
      return {
        date: inv.date, dueDate: inv.dueDate, billTo: inv.billTo, poNumber: inv.poNumber,
        eventProject: inv.eventProject, discount: num(inv.discount),
        mpesaTill: inv.mpesaTill, accountName: inv.accountName, bankDetails: inv.bankDetails,
        lineItems: rows
          .filter((r) => r.description || r.qty || r.rate)
          .map((r) => ({ description: r.description, qty: num(r.qty), rate: num(r.rate) })),
      } as Record<string, unknown>;
    }
    if (type === 'receipt') {
      return {
        date: rct.date, receivedFrom: rct.receivedFrom, amountFigures: num(rct.amountFigures),
        beingPaymentFor: rct.beingPaymentFor, method: rct.method, transactionRef: rct.transactionRef,
        balanceDue: rct.balanceDue === '' ? '' : num(rct.balanceDue), invoiceNo: rct.invoiceNo, receivedBy: rct.receivedBy,
      };
    }
    if (type === 'certw') {
      return { recipientName: cw.recipientName, category: cw.category, stopName: cw.stopName, eventDate: cw.eventDate };
    }
    return { participantName: cp.participantName, podName: cp.podName, stopName: cp.stopName };
  }, [type, inv, rows, rct, cw, cp]);

  // What the live preview renders: in batch mode, the first parsed row; else
  // the single-form payload.
  const previewPayload = useMemo(
    () => (batchMode && csvRows.length > 0 ? csvRows[0] : singlePayload),
    [batchMode, csvRows, singlePayload]
  );

  // Preview only when the identity field for a certificate is present (an empty
  // required field would make /preview 400). Money docs have no required field.
  const previewReady = useMemo(() => {
    const p: any = previewPayload;
    if (type === 'certw') return !!String(p?.recipientName || '').trim();
    if (type === 'certp') return !!String(p?.participantName || '').trim();
    return true;
  }, [type, previewPayload]);

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
  const payloadKey = JSON.stringify({ type, previewPayload, previewReady });
  useEffect(() => {
    if (!previewReady) { setPreviewHtml(''); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      const { status, data } = await api('/api/admin/docs/preview', { method: 'POST', body: JSON.stringify({ type, payload: previewPayload }) });
      if (cancelled) return;
      setBusy(false);
      if (status === 200 && data.html) { setPreviewHtml(data.html); setComputed(data.computed || {}); }
      else if (data?.error) say('Preview: ' + data.error);
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [payloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchType(t: DocType) {
    setType(t); setResult(null); setMode('single');
    setCsvRows([]); setCsvName(''); setCsvError(''); setBatchResult(null);
  }

  async function doGenerate() {
    if (gen) return;
    setGen(true); setResult(null);
    try {
      // Phase 1: reserve the real serial + get the filled HTML.
      const r1 = await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ type, payload: singlePayload }) });
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

  function onCsvFile(file: File) {
    setCsvError(''); setBatchResult(null); setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const matrix = parseCsv(String(reader.result || ''));
        const objs = rowsToObjects(type as 'certw' | 'certp', matrix);
        if (objs.length === 0) { setCsvRows([]); setCsvError('No data rows found in the CSV.'); return; }
        if (objs.length > 300) { setCsvRows([]); setCsvError('Too many rows (' + objs.length + '). Max 300 per batch.'); return; }
        setCsvRows(objs);
      } catch (e: any) {
        setCsvRows([]); setCsvError('Could not parse CSV: ' + (e?.message || 'unknown'));
      }
    };
    reader.onerror = () => setCsvError('Could not read the file.');
    reader.readAsText(file);
  }

  async function doBatch() {
    if (batchBusy || csvRows.length === 0) return;
    setBatchBusy(true); setBatchResult(null); setBatchProgress({ done: 0, total: csvRows.length });
    try {
      // Phase 1: reserve all serials at once. The server validates EVERY row
      // before issuing any serial, so an invalid row reserves nothing.
      const r = await api('/api/admin/docs/batch', { method: 'POST', body: JSON.stringify({ type, rows: csvRows }) });
      if (r.status !== 200 || !r.data?.docs) {
        const d = r.data || {};
        const msg = d.error === 'row_invalid'
          ? `Row ${(d.row ?? 0) + 1} is invalid (${d.detail}). No certificates were issued - fix the CSV and try again.`
          : 'Batch failed: ' + (d.error || r.status);
        setBatchResult({ error: msg }); say(msg); setBatchBusy(false); return;
      }
      const docs: Array<{ id: string; serial: string; html: string; filename: string }> = r.data.docs;

      // Phase 2: rasterise + attach each, collecting PDFs for one ZIP.
      const entries: { name: string; data: Uint8Array }[] = [];
      const serials: string[] = [];
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const { pngDataUrl, pdfDataUrl } = await rasterise(d.html);
        await api('/api/admin/docs/generate', { method: 'POST', body: JSON.stringify({ id: d.id, pdfBase64: pdfDataUrl, pngBase64: pngDataUrl }) });
        entries.push({ name: d.filename, data: dataUrlToBytes(pdfDataUrl) });
        serials.push(d.serial);
        setBatchProgress({ done: i + 1, total: docs.length });
      }

      const zipBlob = buildZipStore(entries);
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipName = `certificates-${type}-${today()}.zip`;
      setBatchResult({ serials, zipUrl, zipName });
      say('Generated ' + serials.length + ' certificates');
      loadRecent();
    } catch (e: any) {
      const msg = 'Batch error: ' + (e?.message || 'unknown');
      setBatchResult({ error: msg }); say(msg);
    } finally {
      setBatchBusy(false);
    }
  }

  async function voidDoc(serial: string) {
    const reason = window.prompt('Reason for voiding ' + serial + '? (a correction is a new document, never an edit)');
    if (reason === null) return;
    const { status, data } = await api('/api/admin/docs/void', { method: 'POST', body: JSON.stringify({ serial, reason }) });
    if (status === 200) { say('Voided ' + serial); loadRecent(); }
    else say('Void failed: ' + (data?.error || status));
  }

  const formTitle = type === 'invoice' ? 'Invoice details'
    : type === 'receipt' ? 'Receipt details'
    : type === 'certw' ? 'Winner certificate' : 'Participation certificate';

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
            <button key={t.key} onClick={() => switchType(t.key)}
              style={{ ...btn, background: type === t.key ? '#C7238E' : '#fff', color: type === t.key ? '#fff' : '#111' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(300px,1.15fr)', gap: 14, alignItems: 'start' }}>
        {/* -------- FORM / BATCH -------- */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ ...h3, margin: 0 }}>{formTitle}</h3>
            {isCertType(type) && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['single', 'batch'] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setResult(null); setBatchResult(null); }}
                    style={{ ...btnSmall, background: mode === m ? '#111' : '#fff', color: mode === m ? '#fff' : '#111' }}>
                    {m === 'single' ? 'Single' : 'Batch from CSV'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {batchMode ? (
            <BatchPanel
              type={type as 'certw' | 'certp'}
              csvName={csvName} csvRows={csvRows} csvError={csvError}
              onFile={onCsvFile} onGenerate={doBatch}
              busy={batchBusy} progress={batchProgress} result={batchResult}
              onClear={() => { setCsvRows([]); setCsvName(''); setCsvError(''); setBatchResult(null); }}
            />
          ) : (
            <>
              <div style={{ marginTop: 12 }}>
                {type === 'invoice' && <InvoiceForm inv={inv} setInv={setInv} rows={rows} setRows={setRows} computed={computed} />}
                {type === 'receipt' && <ReceiptForm rct={rct} setRct={setRct} computed={computed} />}
                {type === 'certw' && <CertWForm cw={cw} setCw={setCw} />}
                {type === 'certp' && <CertPForm cp={cp} setCp={setCp} />}
              </div>

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
            </>
          )}
        </div>

        {/* -------- LIVE PREVIEW -------- */}
        <div style={card}>
          <h3 style={h3}>Live preview</h3>
          <Preview html={previewHtml} docType={type} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
            {batchMode
              ? 'Preview shows the first CSV row. Real serials are issued only when you Generate All.'
              : 'Preview uses a provisional serial. The real serial is issued only when you click Generate.'}
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
    // wait for images (logo, pattern, QR data-url) to decode. Missing brand
    // decorations resolve on error so a broken img never hangs the capture.
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
// CSV parsing (RFC4180-ish, dependency-free): handles a header row, quoted
// fields with embedded commas/newlines, doubled "" escapes, and trailing
// blank lines.
// ---------------------------------------------------------------------------
function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += c; }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); out.push(row); }
  // drop fully-empty rows (trailing newlines / blank separators)
  return out.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// Map a CSV matrix to field objects. If the first row names any known field,
// it is treated as a header and columns are mapped by name; otherwise columns
// are taken positionally in the schema's field order.
function rowsToObjects(type: 'certw' | 'certp', matrix: string[][]): Record<string, string>[] {
  const fields = CSV_FIELDS[type];
  if (matrix.length === 0) return [];
  const known = fields.map((f) => f.toLowerCase());
  const first = matrix[0].map((c) => c.trim());
  const hasHeader = first.some((c) => known.includes(c.toLowerCase()));
  const colToField: (string | null)[] = hasHeader
    ? first.map((c) => { const idx = known.indexOf(c.toLowerCase()); return idx >= 0 ? fields[idx] : null; })
    : fields.map((f) => f);
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  return dataRows.map((cells) => {
    const obj: Record<string, string> = {};
    for (const f of fields) obj[f] = '';
    if (hasHeader) {
      cells.forEach((v, i) => { const f = colToField[i]; if (f) obj[f] = String(v).trim(); });
    } else {
      fields.forEach((f, i) => { obj[f] = String(cells[i] || '').trim(); });
    }
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Client-side ZIP (STORE method, no external dep). PDFs are already
// compressed, so storing avoids shipping a deflate implementation. Produces a
// standard PK\x03\x04 archive; mirrors the server buildZip() byte layout.
// ---------------------------------------------------------------------------
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const idx = dataUrl.indexOf('base64,');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    crcTable = t;
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZipStore(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const now = new Date();
  const time = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
  const date = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0xf) << 5) | (now.getDate() & 0x1f);
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const f of files) {
    const nameBuf = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // bit 11: UTF-8 filenames
    local.setUint16(8, 0, true); // method 0 = store
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBuf.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, nameBuf, data);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, time, true);
    cen.setUint16(14, date, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameBuf.length, true);
    cen.setUint32(42, offset, true);
    central.push(cen.buffer, nameBuf);

    offset += 30 + nameBuf.length + data.length;
    centralSize += 46 + nameBuf.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Sandboxed, auto-scaled preview iframe.
// ---------------------------------------------------------------------------
function Preview({ html, docType }: { html: string; docType: DocType }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const dims = DIMS[docType];
  const frameW = dims.w + 68; // body padding 34 each side
  const frameH = dims.h + 68;

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

function CertWForm({ cw, setCw }: any) {
  const set = (k: string) => (e: any) => setCw({ ...cw, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Recipient name (required)"><input style={inp} value={cw.recipientName} onChange={set('recipientName')} placeholder="Winner's full name" /></Field>
      <Field lbl="Category / award"><input style={inp} value={cw.category} onChange={set('category')} placeholder="e.g. Best Dance Crew" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Stop / venue"><input style={inp} value={cw.stopName} onChange={set('stopName')} placeholder="e.g. Nairobi" /></Field>
        <Field lbl="Event date"><input type="date" style={inp} value={cw.eventDate} onChange={set('eventDate')} /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Certificate number is issued automatically (CERTW serial). To make many at once, switch to Batch from CSV.
      </div>
    </div>
  );
}

function CertPForm({ cp, setCp }: any) {
  const set = (k: string) => (e: any) => setCp({ ...cp, [k]: e.target.value });
  return (
    <div>
      <Field lbl="Participant name (required)"><input style={inp} value={cp.participantName} onChange={set('participantName')} placeholder="Participant's full name" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field lbl="Pod / group"><input style={inp} value={cp.podName} onChange={set('podName')} placeholder="e.g. Rap Pod" /></Field>
        <Field lbl="Stop / venue"><input style={inp} value={cp.stopName} onChange={set('stopName')} placeholder="e.g. Kisumu" /></Field>
      </div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
        Certificate number is issued automatically (CERTP serial). To make many at once, switch to Batch from CSV.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV batch panel: upload -> parsed preview table -> Generate All -> progress
// -> single ZIP of every PDF.
// ---------------------------------------------------------------------------
function BatchPanel({ type, csvName, csvRows, csvError, onFile, onGenerate, busy, progress, result, onClear }: {
  type: 'certw' | 'certp';
  csvName: string; csvRows: Record<string, string>[]; csvError: string;
  onFile: (f: File) => void; onGenerate: () => void; onClear: () => void;
  busy: boolean; progress: { done: number; total: number };
  result: { serials?: string[]; zipUrl?: string; zipName?: string; error?: string } | null;
}) {
  const fields = CSV_FIELDS[type];
  const headers = fields.join(',');
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: '#f6f8fb', border: '1px dashed #b9c3d0', borderRadius: 10, padding: 12, fontSize: 12.5, color: '#445' }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>CSV format</div>
        <div>First row is a header. Columns (in any order): <code style={{ background: '#eef1f5', padding: '1px 5px', borderRadius: 4 }}>{headers}</code></div>
        <div style={{ marginTop: 4, color: '#778' }}>
          {type === 'certw'
            ? 'recipientName is required. category, stopName and eventDate are optional. eventDate may be a plain date (2026-07-11 becomes 11 July 2026) or free text.'
            : 'participantName is required. podName and stopName are optional.'}
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ ...btn, cursor: 'pointer', display: 'inline-block' }}>
          {csvName ? 'Choose a different CSV' : 'Choose CSV file'}
          <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }} />
        </label>
        {csvName && <span style={{ fontSize: 12, color: '#555' }}>{csvName} - {csvRows.length} row{csvRows.length === 1 ? '' : 's'}</span>}
        {csvRows.length > 0 && <button onClick={onClear} style={{ ...btnSmall, background: '#eee' }}>Clear</button>}
      </div>

      {csvError && <div style={{ marginTop: 10, color: '#C62828', fontSize: 13, fontWeight: 600 }}>{csvError}</div>}

      {csvRows.length > 0 && (
        <div style={{ marginTop: 12, overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={th}>#</th>
              {fields.map((f) => <th key={f} style={th}>{f}</th>)}
            </tr></thead>
            <tbody>
              {csvRows.slice(0, 50).map((r, i) => {
                const idField = fields[0];
                const missing = !String(r[idField] || '').trim();
                return (
                  <tr key={i} style={missing ? { background: '#fff4f4' } : undefined}>
                    <td style={td}>{i + 1}</td>
                    {fields.map((f) => (
                      <td key={f} style={{ ...td, color: f === idField && missing ? '#C62828' : '#111', fontWeight: f === idField ? 700 : 400 }}>
                        {f === idField && missing ? '(missing)' : (r[f] || '-')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {csvRows.length > 50 && <div style={{ padding: 8, fontSize: 11, color: '#999' }}>Showing first 50 of {csvRows.length} rows.</div>}
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onGenerate} disabled={busy || csvRows.length === 0} style={{ ...btnMagenta, opacity: busy || csvRows.length === 0 ? 0.6 : 1 }}>
          {busy ? `Generating ${progress.done}/${progress.total}...` : `Generate all (${csvRows.length})`}
        </button>
        {busy && (
          <div style={{ flex: 1, minWidth: 120, height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, height: '100%', background: '#1F8A5B', transition: 'width .2s' }} />
          </div>
        )}
      </div>

      {result?.error && (
        <div style={{ marginTop: 14, border: '2px solid #C62828', borderRadius: 12, padding: 14, background: '#fdf2f2', color: '#8a1f1f', fontSize: 13 }}>
          {result.error}
        </div>
      )}
      {result?.zipUrl && (
        <div style={{ marginTop: 14, border: '2px solid #1F8A5B', borderRadius: 12, padding: 14, background: '#f2fbf6' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 16, color: '#1F8A5B' }}>Issued {result.serials?.length} certificates</div>
          <div style={{ fontSize: 12, color: '#555', margin: '6px 0 10px', wordBreak: 'break-word' }}>
            {result.serials?.[0]} ... {result.serials?.[result.serials.length - 1]}
          </div>
          <a href={result.zipUrl} download={result.zipName} style={{ ...btnMagenta, textDecoration: 'none' }}>Download ZIP ({result.serials?.length} PDFs)</a>
        </div>
      )}
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
