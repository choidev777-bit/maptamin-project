import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/analytics?days=7
export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") || "7");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // 발행된 콘텐츠 + engagement
  const { data: published } = await supabase
    .from("threads_contents")
    .select("id, account, parent_type, text_content, engagement, published_at, link_eligible")
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false });

  // 타입별 집계
  const byType: Record<string, { count: number; likes: number; views: number; replies: number }> = {};
  const byAccount: Record<string, { count: number; likes: number; views: number }> = {};

  for (const p of published || []) {
    const e = p.engagement || {};
    const t = p.parent_type;
    const a = p.account;

    if (!byType[t]) byType[t] = { count: 0, likes: 0, views: 0, replies: 0 };
    byType[t].count++;
    byType[t].likes += e.likes || 0;
    byType[t].views += e.views || 0;
    byType[t].replies += e.replies || 0;

    if (!byAccount[a]) byAccount[a] = { count: 0, likes: 0, views: 0 };
    byAccount[a].count++;
    byAccount[a].likes += e.likes || 0;
    byAccount[a].views += e.views || 0;
  }

  // 패턴 성과
  const { data: patterns } = await supabase
    .from("threads_patterns")
    .select("id, parent_type, pattern_name, avg_engagement, usage_count, success_rate")
    .order("success_rate", { ascending: false })
    .limit(10);

  const totalLikes = (published || []).reduce((s, p) => s + (p.engagement?.likes || 0), 0);
  const totalViews = (published || []).reduce((s, p) => s + (p.engagement?.views || 0), 0);

  return NextResponse.json({
    summary: {
      totalPublished: published?.length || 0,
      totalLikes,
      totalViews,
      avgLikes: published?.length ? Math.round(totalLikes / published.length) : 0,
    },
    byType,
    byAccount,
    topPosts: (published || []).sort((a, b) => (b.engagement?.likes || 0) - (a.engagement?.likes || 0)).slice(0, 5),
    patterns: patterns || [],
  });
}
