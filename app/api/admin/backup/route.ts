import { deflateRawSync } from 'node:zlib';
import { isSuperAdmin, adminActor } from '@/lib/server/session';
import { rateLimit, clientIp } from '@/lib/server/ratelimit';
import { q, db } from '@/lib/server/db';

// Full-database disaster-recovery backup: one ZIP, one CSV per table, every
// table in the schema. Distinct from /api/admin/export (routine per-module
// CSVs) - this is the "everything, one file" button for when the DB itself
// is unavailable. Heavy (SELECT * across every table) so it is rate-limited
// tighter than a normal admin action; it's an intentional manual click, not
// something a page load should ever trigger.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Table names come from information_schema, never from user input, so
// interpolating them into SQL is safe - this regex is defense-in-depth only.
const TABLE_NAME_RE = /^[a-z_][a-z0-9_]*$/;

// Columns that must never leave the building raw, even in an owner-initiated
// backup: scrypt password hashes (stored as "salt:hash" strings - see
// hashPassword in lib/server/session.ts). Matches pass_hash (users) and
// password_hash (marketplace_organizers) plus any future *_hash/*_salt
// variant. No table stores session secrets or API keys - those are env vars
// only (SESSION_SECRET, STRIPE_SECRET_KEY, PAYSTACK_SECRET_KEY, etc.) and
// never touch the database, so there is nothing else to redact here.
const SENSITIVE_COL = /pass(word)?_?(hash|salt)/i;
const REDACTED = '[REDACTED]';

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function csvEsc(v: unknown): string {
  return `"${csvCell(v).replace(/"/g, '""')}"`;
}

// --- Minimal hand-rolled ZIP writer (store or deflate, no external deps) ---
// Verified against `unzip -l`/`unzip -p` during development; produces a
// standard PK\x03\x04 archive any zip tool can open.
let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}
function crc32(buf: Buffer): number {
  const t = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}
function buildZip(files: { name: string; data: Buffer }[]): Buffer {
  const { time, date } = dosDateTime(new Date());
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const dataBuf = f.data;
    const compressed = deflateRawSync(dataBuf);
    const useCompressed = compressed.length < dataBuf.length;
    const method = useCompressed ? 8 : 0;
    const payload = useCompressed ? compressed : dataBuf;
    const crc = crc32(dataBuf);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // bit 11: filenames are UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, end]);
}
// --- end ZIP writer ---

// CRITICAL EXCEPTION (CLAUDE.md): the full database backup is always
// super_admin-only, whatever perms a crew_admin holds - it dumps every
// table, including customer contact info no single module perm covers.
export async function GET(req: Request) {
  if (!isSuperAdmin(req)) return new Response('unauthorized', { status: 401 });
  if (!rateLimit('bak:' + clientIp(req), 2, 60_000)) {
    return new Response('too_many_requests', { status: 429 });
  }
  if (!db()) return new Response('db not configured', { status: 503 });

  let tableNames: string[];
  try {
    const rows = await q<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );
    tableNames = rows.map((r) => r.table_name).filter((t) => TABLE_NAME_RE.test(t));
  } catch (e: any) {
    return new Response(String(e?.message || e).slice(0, 200), { status: 500 });
  }

  const files: { name: string; data: Buffer }[] = [];
  let totalRows = 0;

  for (const table of tableNames) {
    if (!TABLE_NAME_RE.test(table)) continue; // defense-in-depth, redundant with the filter above

    try {
      const colRows = await q<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      const cols = colRows.map((c) => c.column_name);
      const sensitive = new Set(cols.filter((c) => SENSITIVE_COL.test(c)));

      const dataRows = await q(`SELECT * FROM "${table}"`);
      totalRows += dataRows.length;

      const header = cols.map((c) => csvEsc(c)).join(',');
      const lines = dataRows.map((r: any) =>
        cols
          .map((c) => (sensitive.has(c) && r[c] != null ? csvEsc(REDACTED) : csvEsc(r[c])))
          .join(',')
      );
      const csv = [header, ...lines].join('\n') + '\n';
      files.push({ name: `${table}.csv`, data: Buffer.from(csv, 'utf8') });
    } catch (e: any) {
      // Never let one bad table sink the whole backup - record the failure
      // in its own file so it's visible instead of silently missing.
      files.push({
        name: `${table}.csv`,
        data: Buffer.from(`error\n"${String(e?.message || e).replace(/"/g, '""').slice(0, 300)}"\n`, 'utf8'),
      });
    }
  }

  const zipBuf = buildZip(files);
  const stamp = new Date().toISOString().slice(0, 10);
  const actor = adminActor(req);

  q(
    `INSERT INTO audit_log (actor, action, detail) VALUES ($1,'full_backup_download',$2)`,
    [actor, JSON.stringify({ tableCount: tableNames.length, approxRowCount: totalRows })]
  ).catch(() => {
    // audit failures must never block the download itself
  });

  return new Response(zipBuf, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="ugt-backup-${stamp}.zip"`,
      'Content-Length': String(zipBuf.length),
    },
  });
}
