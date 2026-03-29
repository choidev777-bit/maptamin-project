import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 소재 통계
    const { count: totalSources } = await supabase
      .from("threads_raw_sources")
      .select("*", { count: "exact", head: true });

    const { count: analyzedSources } = await supabase
      .from("threads_raw_sources")
      .select("*", { count: "exact", head: true })
      .not("analyzed_at", "is", null);

    const { count: threadsSources } = await supabase
      .from("threads_raw_sources")
      .select("*", { count: "exact", head: true })
      .eq("source_type", "threads");

    const { count: youtubeSources } = await supabase
      .from("threads_raw_sources")
      .select("*", { count: "exact", head: true })
      .in("source_type", ["youtube_long", "youtube_shorts"]);

    // 콘텐츠 통계
    const { count: totalContents } = await supabase
      .from("threads_contents")
      .select("*", { count: "exact", head: true });

    const { count: publishedContents } = await supabase
      .from("threads_contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    const { count: draftContents } = await supabase
      .from("threads_contents")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");

    // 타입별 분류 통계
    const { data: typeStats } = await supabase
      .from("threads_raw_sources")
      .select("content_type")
      .not("content_type", "is", null);

    const typeCounts: Record<string, number> = {};
    (typeStats || []).forEach((row) => {
      const t = row.content_type || "미분류";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    // 최근 수집된 소재 5개
    const { data: recentSources } = await supabase
      .from("threads_raw_sources")
      .select("id, source_type, text_content, likes, content_type, collected_at")
      .order("collected_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      sources: {
        total: totalSources || 0,
        analyzed: analyzedSources || 0,
        threads: threadsSources || 0,
        youtube: youtubeSources || 0,
      },
      contents: {
        total: totalContents || 0,
        published: publishedContents || 0,
        draft: draftContents || 0,
      },
      typeDistribution: typeCounts,
      recentSources: recentSources || [],
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { error: "통계를 가져오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}
