import React from 'react';
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';
import { ensureOpsSchema, opsAudit } from '@/lib/server/ops';
import { getLogoDataUri, OutboundPdf, BudgetSheetPdf, EventReportPdf, OutboundDoc, EventReportInput } from '@/lib/ops/pdf';
import { BudgetData } from '@/lib/ops/budget-calc';

// Branded PDF renderer. Admin only.
//   ?type=doc&id=N      -> quotation / invoice / receipt (OUTBOUND: no internal costs)
//   ?type=budget&id=N   -> internal budget sheet for a saved budget version
//   ?type=report&eventId=N -> internal event financial report

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function safeName(x: string): string {
  return x.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'document';
}

// renderToBuffer's typings want a ReactElement<DocumentProps>; our template
// components return a <Document> internally, so the cast is safe.
function render(el: React.ReactElement): Promise<Buffer> {
  return renderToBuffer(el as React.ReactElement<any>);
}

function pdfResponse(buf: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName(filename)}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return bad('unauthorized', 401);
  if (!db()) return bad('db_not_configured', 503);
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const id = Number(url.searchParams.get('id') || 0);
  const eventId = Number(url.searchParams.get('eventId') || 0);
  try {
    await ensureOpsSchema();
    const logo = await getLogoDataUri();

    if (type === 'doc') {
      if (!id) return bad('missing_id');
      const rows = await q<any>(`
        SELECT d.*, COALESCE((SELECT SUM(p.amount) FROM ops_payments p WHERE p.invoice_id=d.id),0) AS paid
        FROM ops_documents d WHERE d.id=$1`, [id]);
      if (!rows.length) return bad('not_found', 404);
      const r = rows[0];
      const doc: OutboundDoc = {
        doc_type: r.doc_type,
        doc_number: r.doc_number,
        bill_to: typeof r.bill_to === 'string' ? JSON.parse(r.bill_to) : r.bill_to || {},
        lines: typeof r.lines === 'string' ? JSON.parse(r.lines) : r.lines || [],
        payment_terms: r.payment_terms || '',
        due_date: r.due_date,
        pay_details: r.pay_details || '',
        notes: r.notes || '',
        created_at: r.created_at,
        paid: Number(r.paid || 0),
      };
      const buf = await render(React.createElement(OutboundPdf, { doc, logo }));
      await opsAudit('ops.pdf.doc', { id, doc_number: r.doc_number });
      return pdfResponse(buf, `${r.doc_number}.pdf`);
    }

    if (type === 'budget') {
      if (!id) return bad('missing_id');
      const rows = await q<any>(`SELECT b.*, e.name AS event_name FROM ops_budgets b JOIN ops_events e ON e.id=b.event_id WHERE b.id=$1`, [id]);
      if (!rows.length) return bad('not_found', 404);
      const r = rows[0];
      const data: BudgetData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      const buf = await render(React.createElement(BudgetSheetPdf, {
        data, eventName: r.event_name, version: Number(r.version), createdAt: r.created_at, logo,
      }));
      await opsAudit('ops.pdf.budget', { id, eventId: r.event_id, version: r.version });
      return pdfResponse(buf, `UGT-budget-${r.event_name}-v${r.version}.pdf`);
    }

    if (type === 'report') {
      if (!eventId) return bad('missing_eventId');
      const ev = await q<any>(`SELECT * FROM ops_events WHERE id=$1`, [eventId]);
      if (!ev.length) return bad('not_found', 404);
      const latest = await q<any>(`SELECT version, data FROM ops_budgets WHERE event_id=$1 ORDER BY version DESC LIMIT 1`, [eventId]);
      const payments = await q<any>(`SELECT amount, paid_on, method, reference FROM ops_payments WHERE event_id=$1 ORDER BY paid_on`, [eventId]);
      const payouts = await q<any>(`SELECT person, role, amount, paid, paid_on FROM ops_crew_payouts WHERE event_id=$1 ORDER BY id`, [eventId]);
      const expenses = await q<any>(`SELECT label, category, amount, spent_on FROM ops_expenses WHERE event_id=$1 ORDER BY spent_on`, [eventId]);
      const input: EventReportInput = {
        event: ev[0],
        budget: latest.length ? { version: Number(latest[0].version), data: (typeof latest[0].data === 'string' ? JSON.parse(latest[0].data) : latest[0].data) as BudgetData } : null,
        payments, payouts, expenses,
      };
      const buf = await render(React.createElement(EventReportPdf, { input, logo }));
      await opsAudit('ops.pdf.report', { eventId });
      return pdfResponse(buf, `UGT-event-report-${ev[0].name}.pdf`);
    }

    return bad('unknown_type');
  } catch (e: any) {
    if (String(e?.message) === 'db_not_configured') return bad('db_not_configured', 503);
    return bad(String(e?.message || e).slice(0, 200), 500);
  }
}
