"use client";
import { useEffect, useState, useCallback } from "react";

interface Content {
  id: string; account: string; text_content: string; parent_type: string;
  status: string; published_at: string | null; link_eligible: boolean;
}

export default function PublishingPage() {
  const [queued, setQueued] = useState<Content[]>([]);
  const [published, setPublished] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, pRes] = await Promise.all([
      fetch("/api/contents?status=queued&pageSize=50"),
      fetch("/api/contents?status=published&pageSize=10"),
    ]);
    const [qData, pData] = await Promise.all([qRes.json(), pRes.json()]);
    setQueued(qData.data || []);
    setPublished(pData.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">발행</h2>

      {/* Queued */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">발행 대기열 ({queued.length})</h3>
        {queued.length === 0 ? (
          <div className="border rounded-lg p-8 text-center"><p className="text-sm text-muted-foreground">대기 중인 글이 없습니다.</p></div>
        ) : (
          <div className="space-y-2">
            {queued.map((c, i) => (
              <div key={c.id} className="border rounded-lg p-4 bg-card flex items-start gap-4">
                <span className="text-xs text-muted-foreground font-mono mt-1">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">@{c.account === "bono" ? "bono_marketing" : "place_hacker_"}</span>
                    <span className="text-xs text-muted-foreground">{c.parent_type}</span>
                    {c.link_eligible && <span className="text-xs px-1.5 py-0.5 rounded bg-type-a text-type-a-foreground">링크</span>}
                  </div>
                  <p className="text-sm text-foreground truncate">{c.text_content?.slice(0, 100)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Published */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">최근 발행</h3>
        {published.length === 0 ? (
          <div className="border rounded-lg p-8 text-center"><p className="text-sm text-muted-foreground">발행된 글이 없습니다.</p></div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">계정</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">내용</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">타입</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">발행일</th>
                </tr>
              </thead>
              <tbody>
                {published.map(c => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-xs text-muted-foreground">@{c.account === "bono" ? "bono_marketing" : "place_hacker_"}</td>
                    <td className="px-4 py-3 text-foreground truncate max-w-md">{c.text_content?.slice(0, 60)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.parent_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.published_at ? new Date(c.published_at).toLocaleDateString("ko-KR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
