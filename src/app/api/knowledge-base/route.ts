import { NextRequest, NextResponse } from "next/server";
import { deleteKnowledgeSection, loadKnowledgeBase, saveKnowledgeSection } from "@/lib/knowledge-base";
import type { KnowledgeSection } from "@/lib/knowledge-base";

export async function GET(req: NextRequest) {
  const defaultsOnly = req.nextUrl.searchParams.get("defaults") === "1";
  const kb = defaultsOnly ? await loadKnowledgeBase(true) : await loadKnowledgeBase();
  return NextResponse.json(kb);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, content } = body || {};
    if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!content || typeof content !== "string") return NextResponse.json({ error: "content required" }, { status: 400 });
    const section: KnowledgeSection = { id: id as any, title: title || id, content };
    const kb = await saveKnowledgeSection(section);
    return NextResponse.json(kb);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "unknown" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") as any;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const kb = await deleteKnowledgeSection(id);
    return NextResponse.json(kb);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "unknown" }, { status: 500 });
  }
}
