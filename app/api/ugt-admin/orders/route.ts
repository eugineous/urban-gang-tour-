import { NextResponse } from "next/server";
import { listOrders } from "@/lib/orders";

// Protected by middleware.ts (PROTECTED_PREFIXES includes /api/ugt-admin).
export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load orders" },
      { status: 503 }
    );
  }
}
