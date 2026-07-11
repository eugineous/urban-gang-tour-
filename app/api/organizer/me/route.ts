import { NextResponse } from 'next/server';
import { currentOrganizer } from '@/lib/server/organizer-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({ organizer: currentOrganizer(req) });
}
