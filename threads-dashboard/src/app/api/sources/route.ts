import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/sources?page=0&pageSize=20&source_type=threads&content_type=A
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "0");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const source_type = sp.get("source_type");
  const content_type = sp.get("content_type");
  const analyzed = sp.get("analyzed"); // "true" | "false"

  let query = supabase
    .from("threads_raw_sources")
    .select("*", { count: "exact" })
    .order("collected_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (source_type) query = query.eq("source_type", source_type);
  if (content_type) query = query.eq("content_type", content_type);
  if (analyzed === "true") query = query.not("analyzed_at", "is", null);
  if (analyzed === "false") query = query.is("analyzed_at", null);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, pageSize });
}
