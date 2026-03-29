import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/patterns?type=A
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  let query = supabase
    .from("threads_patterns")
    .select("*")
    .order("usage_count", { ascending: false });

  if (type) query = query.eq("parent_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
