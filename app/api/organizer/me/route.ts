import { NextResponse } from 'next/server';
import { currentApprovedOrganizer } from '@/lib/server/organizer-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const access = await currentApprovedOrganizer(req);
  if (!access.organizer)
    return NextResponse.json({ organizer: null, error: access.error }, { status: access.status });
  return NextResponse.json({ organizer: access.organizer });
}
