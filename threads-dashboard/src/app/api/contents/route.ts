import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/contents?page=0&status=draft&account=bono
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "0");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status");
  const account = sp.get("account");
  const parent_type = sp.get("parent_type");

  let query = supabase
    .from("threads_contents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (account) query = query.eq("account", account);
  if (parent_type) query = query.eq("parent_type", parent_type);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, pageSize });
}

// PUT /api/contents — update status (approve/reject)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, status, text_content } = body;

  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (text_content !== undefined) updates.text_content = text_content;
  if (status === "published") updates.published_at = new Date().toISOString();

  const { error } = await supabase.from("threads_contents").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/contents?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("threads_contents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
