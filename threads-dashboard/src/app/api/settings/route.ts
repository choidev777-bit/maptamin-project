import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data: accounts } = await supabase
      .from("threads_accounts_config")
      .select("*");

    const { data: product } = await supabase
      .from("threads_product_config")
      .select("*")
      .limit(1)
      .single();

    return NextResponse.json({ accounts: accounts || [], product });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "설정을 가져오는 데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type === "account") {
      const { error } = await supabase
        .from("threads_accounts_config")
        .update({
          topic: data.topic,
          tone: data.tone,
          scan_keywords: data.scan_keywords,
          banned_words: data.banned_words,
          interval_hours: data.interval_hours,
          daily_limit: data.daily_limit,
          active_hours_start: data.active_hours_start,
          active_hours_end: data.active_hours_end,
          is_active: data.is_active,
        })
        .eq("id", data.id);

      if (error) throw error;
    } else if (type === "product") {
      const { error } = await supabase
        .from("threads_product_config")
        .update({
          product_name: data.product_name,
          product_description: data.product_description,
          product_features: data.product_features,
          related_topics: data.related_topics,
          product_link: data.product_link,
          link_comment_templates: data.link_comment_templates,
          min_likes: data.min_likes,
          min_views: data.min_views,
          analyze_interval_hours: data.analyze_interval_hours,
          generate_interval_hours: data.generate_interval_hours,
        })
        .eq("id", data.id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
