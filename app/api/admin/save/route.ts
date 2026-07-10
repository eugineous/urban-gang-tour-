import { NextResponse } from 'next/server';
import { q, db } from '@/lib/server/db';
import { isAdmin } from '@/lib/server/session';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70);
}

// Multiplexed admin mutations. kind: post|deletePost|setting|bookingStatus|orderStatus|deleteSubmission
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!db()) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const { kind, data } = await req.json().catch(() => ({}));
  try {
    switch (kind) {
      case 'post': {
        const slug = data.slug ? slugify(data.slug) : slugify(data.headline || '');
        if (!slug || !data.headline) return NextResponse.json({ error: 'need_headline' }, { status: 400 });
        const body = Array.isArray(data.body)
          ? data.body
          : String(data.body || '').split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);
        await q(
          `INSERT INTO posts (slug, headline, section, image, dek, body, published, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE))
           ON CONFLICT (slug) DO UPDATE SET headline=$2, section=$3, image=$4, dek=$5, body=$6, published=$7,
             date=COALESCE($8::date, posts.date), updated_at=now()`,
          [slug, data.headline, data.section || 'News', data.image || '', data.dek || '', JSON.stringify(body), data.published !== false, data.date || null]
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','save_post',$1)`, [JSON.stringify({ slug })]);
        return NextResponse.json({ ok: true, slug });
      }
      case 'deletePost':
        await q(`DELETE FROM posts WHERE slug=$1`, [data.slug]);
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','delete_post',$1)`, [JSON.stringify({ slug: data.slug })]);
        return NextResponse.json({ ok: true });
      case 'setting':
        await q(
          `INSERT INTO settings (key, value) VALUES ($1,$2)
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
          [String(data.key), JSON.stringify(data.value)]
        );
        await q(`INSERT INTO audit_log (actor, action, detail) VALUES ('admin','save_setting',$1)`, [JSON.stringify({ key: data.key })]);
        return NextResponse.json({ ok: true });
      case 'bookingStatus':
        await q(`UPDATE bookings SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      case 'orderStatus':
        await q(`UPDATE orders SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      case 'submissionStatus':
        await q(`UPDATE submissions SET status=$2 WHERE id=$1`, [data.id, data.status]);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'unknown_kind' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message).slice(0, 200) }, { status: 500 });
  }
}
