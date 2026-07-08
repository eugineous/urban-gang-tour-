import { NextResponse } from "next/server";
import { getAuditLog } from "@/lib/audit-log";

// Protected by middleware.ts (UGT_ADMIN_PROTECTED_PREFIXES includes /api/ugt-admin).
export async function GET() {
  const entries = await getAuditLog(100);
  return NextResponse.json({ entries });
}
