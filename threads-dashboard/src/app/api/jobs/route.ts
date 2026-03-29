import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/jobs?page=0
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "0");
  const pageSize = parseInt(sp.get("pageSize") || "20");

  const { data, count, error } = await supabase
    .from("threads_job_queue")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count, page, pageSize });
}

// POST /api/jobs — create new job
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_type, params } = body;

  if (!job_type) return NextResponse.json({ error: "job_type required" }, { status: 400 });

  // 같은 타입의 pending 작업 중복 방지
  const { data: existing } = await supabase
    .from("threads_job_queue")
    .select("id")
    .eq("job_type", job_type)
    .eq("status", "pending")
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "이미 대기 중인 동일 작업이 있습니다." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("threads_job_queue")
    .insert({ job_type, params: params || {} })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
