"use client";
import { useEffect, useState, useCallback } from "react";

interface Source {
  id: string; source_type: string; text_content: string; likes: number;
  replies: number; reposts: number; views: number | null;
  content_type: string | null; category: string | null; hook_style: string | null;
  engagement_score: number; collected_at: string; analyzed_at: string | null;
  source_url: string | null; author: string | null;
}

const TYPE_LABELS: Record<string, string> = { A: "트래픽", B: "인사이트", C: "라포", D: "트렌드" };
const TYPE_STYLES: Record<string, string> = {
  A: "bg-type-a text-type-a-foreground",
  B: "bg-type-b text-type-b-foreground",
  C: "bg-type-c text-type-c-foreground",
  D: "bg-type-d text-type-d-foreground",
};

function Badge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-muted-foreground">미분류</span>;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[type] || ""}`}>{type} · {TYPE_LABELS[type] || type}</span>;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ source_type: "", content_type: "", analyzed: "" });
  const [jobMsg, setJobMsg] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filter.source_type) params.set("source_type", filter.source_type);
    if (filter.content_type) params.set("content_type", filter.content_type);
    if (filter.analyzed) params.set("analyzed", filter.analyzed);
    const res = await fetch(`/api/sources?${params}`);
    const data = await res.json();
    setSources(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const triggerJob = async (type: string) => {
    setJobMsg("");
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_type: type }) });
    const data = await res.json();
    setJobMsg(res.ok ? `${type} 작업 등록 완료` : data.error || "실패");
    setTimeout(() => setJobMsg(""), 3000);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">소재 ({total})</h2>
        <div className="flex items-center gap-2">
          {jobMsg && <span className="text-xs px-3 py-1 rounded-full bg-success text-success-foreground">{jobMsg}</span>}
          <button onClick={() => triggerJob("scan_feed")} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">피드 스캔</button>
          <button onClick={() => triggerJob("scan_search")} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer">키워드 스캔</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filter.source_type} onChange={e => { setFilter(f => ({ ...f, source_type: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">전체 소스</option>
          <option value="threads">Threads</option>
          <option value="youtube_long">YouTube (롱폼)</option>
          <option value="youtube_shorts">YouTube (쇼츠)</option>
        </select>
        <select value={filter.content_type} onChange={e => { setFilter(f => ({ ...f, content_type: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">전체 타입</option>
          <option value="A">A · 트래픽</option>
          <option value="B">B · 인사이트</option>
          <option value="C">C · 라포</option>
          <option value="D">D · 트렌드</option>
        </select>
        <select value={filter.analyzed} onChange={e => { setFilter(f => ({ ...f, analyzed: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">분석 여부</option>
          <option value="true">분석 완료</option>
          <option value="false">미분석</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><p className="text-sm text-muted-foreground">로딩 중...</p></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">타입</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">내용</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">소스</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-16">좋아요</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground w-16">점수</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28">수집일</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3"><Badge type={s.content_type} /></td>
                  <td className="px-4 py-3 text-foreground">
                    <p className="truncate max-w-xl">{s.text_content?.slice(0, 80)}</p>
                    {s.category && <span className="text-xs text-muted-foreground mt-0.5 block">{s.category}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.source_type}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.likes?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{s.engagement_score?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.collected_at).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">소재가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs disabled:opacity-50 border-none cursor-pointer">이전</button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs disabled:opacity-50 border-none cursor-pointer">다음</button>
        </div>
      )}
    </div>
  );
}
