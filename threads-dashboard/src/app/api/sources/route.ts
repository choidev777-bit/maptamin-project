import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createHash } from "crypto";

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

// ── 수동 소재 등록 ──

function generateHash(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

function detectSourceType(input: string): { sourceType: string; isUrl: boolean } {
  const trimmed = input.trim();
  if (!trimmed.startsWith("http")) return { sourceType: "manual", isUrl: false };
  if (trimmed.includes("threads.net") || trimmed.includes("threads.com"))
    return { sourceType: "threads", isUrl: true };
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be"))
    return { sourceType: "youtube_long", isUrl: true };
  return { sourceType: "web", isUrl: true };
}

function detectExtractJobType(sourceType: string): string | null {
  const map: Record<string, string> = {
    threads: "extract_threads",
    youtube_long: "extract_youtube",
    youtube_shorts: "extract_youtube",
    web: "extract_web",
  };
  return map[sourceType] || null;
}

// POST /api/sources — 수동 소재 등록
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { input, source_role } = body as { input?: string; source_role?: string };

  // 유효성 검사
  if (!input || !input.trim()) {
    return NextResponse.json({ error: "내용 또는 URL을 입력해주세요." }, { status: 400 });
  }
  if (!source_role || !["content", "pattern", "both"].includes(source_role)) {
    return NextResponse.json({ error: "소재 역할을 선택해주세요." }, { status: 400 });
  }

  const trimmedInput = input.trim();
  const { sourceType, isUrl } = detectSourceType(trimmedInput);

  // content_hash 생성: 텍스트→텍스트 기반, URL→URL 기반
  const hashSource = isUrl ? trimmedInput : trimmedInput;
  const contentHash = generateHash(hashSource);

  // 중복 체크
  const { data: existing } = await supabase
    .from("threads_raw_sources")
    .select("id")
    .eq("content_hash", contentHash)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "이미 등록된 소재입니다." }, { status: 409 });
  }

  // DB 저장
  const row: Record<string, unknown> = {
    source_type: sourceType,
    input_method: "manual",
    content_hash: contentHash,
    source_role,
    text_content: isUrl ? "" : trimmedInput,
    source_url: isUrl ? trimmedInput : null,
    likes: 0,
    replies: 0,
    reposts: 0,
    engagement_score: 0,
    // 직접 텍스트 + content 역할 → 즉시 분석완료 처리 (AI 분석 불필요)
    analyzed_at: (!isUrl && source_role === "content") ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("threads_raw_sources")
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // URL 입력 시 → VPS에 본문 추출 job 등록
  if (isUrl) {
    const jobType = detectExtractJobType(sourceType);
    if (jobType) {
      await supabase
        .from("threads_job_queue")
        .insert({
          job_type: jobType,
          params: { url: trimmedInput, source_id: data.id },
        });
    }
  }

  // 직접 텍스트 + pattern/both → 패턴 추출 AI job 등록
  if (!isUrl && (source_role === "pattern" || source_role === "both")) {
    await supabase
      .from("threads_job_queue")
      .insert({
        job_type: "analyze_pattern",
        params: { source_id: data.id },
      });
  }

  return NextResponse.json({ data, isUrl });

}

// DELETE /api/sources — 소재 삭제
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const all = sp.get("all");

  if (all === "true") {
    // 미분석 소재만 삭제 (library에 있는 분석완료 소재는 보호)
    const { error } = await supabase
      .from("threads_raw_sources")
      .delete()
      .is("analyzed_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: "all" });
  }

  if (!id) {
    return NextResponse.json({ error: "삭제할 소재 ID가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("threads_raw_sources")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: id });
}

// PATCH /api/sources — 추출 대기 중인 URL 소재들의 extract job 일괄 등록
export async function PATCH() {
  // source_url이 있고 text_content가 비어있는 소재 = 추출 미완료
  const { data: pending, error } = await supabase
    .from("threads_raw_sources")
    .select("id, source_type, source_url")
    .not("source_url", "is", null)
    .is("analyzed_at", null)
    .eq("text_content", "");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: "추출 대기 중인 소재가 없습니다.", count: 0 });
  }

  let registered = 0;
  for (const src of pending) {
    const jobType = detectExtractJobType(src.source_type);
    if (!jobType) continue;
    await supabase.from("threads_job_queue").insert({
      job_type: jobType,
      params: { url: src.source_url, source_id: src.id },
    });
    registered++;
  }

  return NextResponse.json({ message: `${registered}개 추출 작업 등록 완료`, count: registered });
}
