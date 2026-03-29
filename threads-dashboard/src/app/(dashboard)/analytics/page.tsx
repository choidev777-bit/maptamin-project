"use client";
import { useEffect, useState } from "react";

interface Analytics {
  summary: { totalPublished: number; totalLikes: number; totalViews: number; avgLikes: number };
  byType: Record<string, { count: number; likes: number; views: number; replies: number }>;
  byAccount: Record<string, { count: number; likes: number; views: number }>;
  topPosts: Array<{ id: string; account: string; parent_type: string; text_content: string; engagement: Record<string, number>; published_at: string }>;
  patterns: Array<{ id: string; parent_type: string; pattern_name: string; avg_engagement: number; usage_count: number; success_rate: number }>;
}

const TYPE_LABELS: Record<string, string> = { A: "트래픽", B: "인사이트", C: "라포", D: "트렌드" };
const TYPE_STYLES: Record<string, string> = {
  A: "bg-type-a text-type-a-foreground",
  B: "bg-type-b text-type-b-foreground",
  C: "bg-type-c text-type-c-foreground",
  D: "bg-type-d text-type-d-foreground",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;
  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-sm text-destructive-foreground">로드 실패</p></div>;

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">성과</h2>
        <select value={days} onChange={e => setDays(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value={3}>최근 3일</option>
          <option value={7}>최근 7일</option>
          <option value={14}>최근 14일</option>
          <option value={30}>최근 30일</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "발행 수", value: s.totalPublished },
          { label: "총 좋아요", value: s.totalLikes.toLocaleString() },
          { label: "총 조회수", value: s.totalViews.toLocaleString() },
          { label: "평균 좋아요", value: s.avgLikes },
        ].map(c => (
          <div key={c.label} className="border rounded-lg p-5 bg-card">
            <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
            <p className="text-2xl font-semibold text-card-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Type Performance */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">타입별 성과</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {["A", "B", "C", "D"].map(t => {
            const d = data.byType[t] || { count: 0, likes: 0, views: 0, replies: 0 };
            return (
              <div key={t} className="border rounded-lg p-4 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[t]}`}>{t} · {TYPE_LABELS[t]}</span>
                  <span className="text-sm font-semibold text-card-foreground">{d.count}편</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-xs text-muted-foreground">좋아요</p><p className="text-sm font-medium text-foreground">{d.likes}</p></div>
                  <div><p className="text-xs text-muted-foreground">조회</p><p className="text-sm font-medium text-foreground">{d.views}</p></div>
                  <div><p className="text-xs text-muted-foreground">답글</p><p className="text-sm font-medium text-foreground">{d.replies}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Performance */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">계정별 성과</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data.byAccount).map(([acc, d]) => (
            <div key={acc} className="border rounded-lg p-4 bg-card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-card-foreground">@{acc === "bono" ? "bono_marketing" : "place_hacker_"}</p>
                <p className="text-xs text-muted-foreground">{d.count}편 발행</p>
              </div>
              <div className="flex gap-6 text-center">
                <div><p className="text-xs text-muted-foreground">좋아요</p><p className="text-sm font-semibold text-foreground">{d.likes}</p></div>
                <div><p className="text-xs text-muted-foreground">조회</p><p className="text-sm font-semibold text-foreground">{d.views}</p></div>
              </div>
            </div>
          ))}
          {Object.keys(data.byAccount).length === 0 && (
            <div className="border rounded-lg p-8 text-center col-span-2"><p className="text-sm text-muted-foreground">아직 발행 데이터가 없습니다.</p></div>
          )}
        </div>
      </div>

      {/* Top Posts */}
      {data.topPosts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">인기 게시물 TOP 5</h3>
          <div className="space-y-2">
            {data.topPosts.map((p, i) => (
              <div key={p.id} className="border rounded-lg p-4 bg-card flex items-start gap-4">
                <span className="text-lg font-semibold text-muted-foreground mt-0.5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[p.parent_type]}`}>{p.parent_type}</span>
                    <span className="text-xs text-muted-foreground">@{p.account === "bono" ? "bono_marketing" : "place_hacker_"}</span>
                  </div>
                  <p className="text-sm text-foreground truncate">{p.text_content?.slice(0, 80)}</p>
                </div>
                <div className="flex gap-4 text-center shrink-0">
                  <div><p className="text-xs text-muted-foreground">좋아요</p><p className="text-sm font-semibold text-foreground">{p.engagement?.likes || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">조회</p><p className="text-sm font-semibold text-foreground">{p.engagement?.views || 0}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Performance */}
      {data.patterns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">패턴 성과</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">타입</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">패턴명</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">사용</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">참여도</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">성공률</th>
                </tr>
              </thead>
              <tbody>
                {data.patterns.map(p => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[p.parent_type]}`}>{p.parent_type} · {TYPE_LABELS[p.parent_type]}</span></td>
                    <td className="px-4 py-3 text-foreground">{p.pattern_name}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.usage_count}회</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.avg_engagement.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{(p.success_rate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
