import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/library?tab=content&page=0&pageSize=20
// GET /api/library?tab=pattern&page=0&pageSize=20&type=A
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") || "content"; // "content" | "pattern"
  const page = parseInt(sp.get("page") || "0");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const contentType = sp.get("type"); // A/B/C/D (패턴 탭 전용)

  if (tab === "pattern") {
    // 패턴 소재: threads_patterns 테이블 조회
    let query = supabase
      .from("threads_patterns")
      .select("*", { count: "exact" })
      .order("avg_engagement", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (contentType) query = query.eq("parent_type", contentType);

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, total: count, page, pageSize });
  }

  // 내용 소재: threads_raw_sources 중 source_role = content 또는 both
  let query = supabase
    .from("threads_raw_sources")
    .select("id, text_content, source_type, source_role, content_type, category, ai_summary, ai_key_points, likes, engagement_score, collected_at, analyzed_at", { count: "exact" })
    .or("source_role.eq.content,source_role.eq.both")
    .not("analyzed_at", "is", null)
    .order("collected_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, pageSize });
}

// DELETE /api/library?tab=content&id=xxx  또는  ?tab=pattern&id=xxx
// DELETE /api/library?tab=content&all=true  또는  ?tab=pattern&all=true
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") || "content";
  const id = sp.get("id");
  const all = sp.get("all");

  const table = tab === "pattern" ? "threads_patterns" : "threads_raw_sources";

  if (all === "true") {
    if (tab === "content") {
      // 내용 소재 전체삭제: source_role이 content 또는 both이고 analyzed_at이 있는 것만
      const { error } = await supabase.from(table).delete().or("source_role.eq.content,source_role.eq.both").not("analyzed_at", "is", null);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // 패턴 소재 전체삭제
      const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: "all", tab });
  }

  if (!id) {
    return NextResponse.json({ error: "삭제할 항목 ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: id, tab });
}

