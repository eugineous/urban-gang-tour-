import { NextResponse } from 'next/server';
import { db, q } from '@/lib/server/db';
import { isSuperAdmin, adminActor } from '@/lib/server/session';
import { requireOrigin } from '@/lib/server/origin';
import {
  listAdminAccounts, upsertAdminAccount, removeAdminAccount, MODULE_KEYS, isModuleKey,
  type AdminRole, type ModuleKey,
} from '@/lib/server/admin-accounts';

// Manage who can sign in to the Control Room via Google, and what they can
// touch. CRITICAL: this whole route is super_admin-only, no exceptions - a
// crew_admin must never be able to grant themselves (or anyone else) more
// access. Every change is audit-logged with the acting super_admin's email.

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function audit(actor: string, action: string, detail: unknown) {
  try {
    await q(`INSERT INTO audit_log (actor, action, detail) VALUES ($1,$2,$3)`, [actor, action, JSON.stringify(detail ?? {})]);
  } catch {
    // audit failures must never block the mutation itself
  }
}

export async function GET(req: Request) {
  if (!isSuperAdmin(req)) return bad('unauthorized', 401);
  if (!db()) return bad('db_not_configured', 503);
  try {
    const rows = await listAdminAccounts();
    return NextResponse.json({ ok: true, rows, moduleKeys: MODULE_KEYS });
  } catch (e: any) {
    return bad(String(e?.message || e).slice(0, 200), 500);
  }
}

export async function POST(req: Request) {
  if (!isSuperAdmin(req)) return bad('unauthorized', 401);
  if (!requireOrigin(req)) return bad('bad_origin', 403);
  if (!db()) return bad('db_not_configured', 503);
  let body: any;
  try { body = await req.json(); } catch { return bad('invalid_json'); }
  const kind = String(body?.kind || '');
  const d = body?.data ?? {};
  const actor = adminActor(req);

  try {
    switch (kind) {
      case 'add':
      case 'update': {
        const email = String(d.email || '').trim().toLowerCase();
        if (!email || !EMAIL_RE.test(email) || email.length > 200) return bad('invalid_email');
        const role: AdminRole = d.role === 'crew_admin' ? 'crew_admin' : 'super_admin';
        const permsIn = Array.isArray(d.perms) ? d.perms : [];
        for (const p of permsIn) if (!isModuleKey(p)) return bad(`invalid_perm:${p}`);
        const perms = permsIn as ModuleKey[];
        const row = await upsertAdminAccount(email, role, perms);
        await audit(actor, kind === 'add' ? 'admin_account.add' : 'admin_account.update', { email, role, perms });
        return NextResponse.json({ ok: true, row });
      }
      case 'remove': {
        const email = String(d.email || '').trim().toLowerCase();
        if (!email) return bad('missing_email');
        const removed = await removeAdminAccount(email);
        if (!removed) return bad('not_found', 404);
        await audit(actor, 'admin_account.remove', { email });
        return NextResponse.json({ ok: true });
      }
      default:
        return bad('unknown_kind');
    }
  } catch (e: any) {
    if (String(e?.message) === 'db_not_configured') return bad('db_not_configured', 503);
    return bad(String(e?.message || e).slice(0, 200), 500);
  }
}
