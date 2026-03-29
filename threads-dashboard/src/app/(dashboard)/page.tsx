"use client";
import { useEffect, useState } from "react";

interface Stats {
  sources: { total: number; analyzed: number; threads: number; youtube: number };
  contents: { total: number; published: number; draft: number };
  typeDistribution: Record<string, number>;
  recentSources: Array<{ id: string; source_type: string; text_content: string; likes: number; content_type: string | null; collected_at: string }>;
}

const TL: Record<string, string> = { A: "트래픽", B: "인사이트", C: "라포", D: "트렌드" };
const TC: Record<string, string> = { A: "bg-type-a text-type-a-foreground", B: "bg-type-b text-type-b-foreground", C: "bg-type-c text-type-c-foreground", D: "bg-type-d text-type-d-foreground" };

function Badge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-muted-foreground">미분류</span>;
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${TC[type] || "bg-secondary text-secondary-foreground"}`}>{type} · {TL[type] || type}</span>;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;
  if (!stats) return <div className="flex items-center justify-center h-64"><p className="text-sm text-destructive-foreground">데이터를 불러올 수 없습니다.</p></div>;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">현황</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 소재", value: stats.sources.total, sub: `분석 완료: ${stats.sources.analyzed}` },
          { label: "스레드 소재", value: stats.sources.threads },
          { label: "유튜브 소재", value: stats.sources.youtube },
          { label: "생성된 콘텐츠", value: stats.contents.total, sub: `발행: ${stats.contents.published}` },
        ].map((s) => (
          <div key={s.label} className="border rounded-lg p-5 bg-card">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-card-foreground">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">타입별 분류</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {["A", "B", "C", "D"].map(t => (
            <div key={t} className="border rounded-lg p-4 bg-card flex items-center justify-between">
              <Badge type={t} />
              <span className="text-lg font-semibold text-card-foreground">{stats.typeDistribution[t] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">최근 수집 소재</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">타입</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">내용</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">좋아요</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">소스</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSources.map(s => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3"><Badge type={s.content_type} /></td>
                  <td className="px-4 py-3 text-foreground max-w-md truncate">{s.text_content?.slice(0, 60)}...</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.likes?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.source_type}</td>
                </tr>
              ))}
              {stats.recentSources.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">수집된 소재가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
