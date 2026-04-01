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
  const [minLikes, setMinLikes] = useState(5);
  const [minViews, setMinViews] = useState(1000);

  const [productId, setProductId] = useState<string>("");
  // 수동 등록 모달
  const [showModal, setShowModal] = useState(false);
  const [regInput, setRegInput] = useState("");
  const [regRole, setRegRole] = useState<"content" | "pattern" | "both">("content");
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
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

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.product) {
        setMinLikes(d.product.min_likes ?? 5);
        setMinViews(d.product.min_views ?? 1000);

        setProductId(d.product.id);
      }
    }).catch(() => {});
  }, []);

  const triggerJob = async (type: string) => {
    setJobMsg("");
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_type: type }) });
    const data = await res.json();
    setJobMsg(res.ok ? `${type} 작업 등록 완료` : data.error || "실패");
    setTimeout(() => setJobMsg(""), 3000);
  };

  const triggerExtract = async () => {
    setJobMsg("");
    const res = await fetch("/api/sources", { method: "PATCH" });
    const data = await res.json();
    setJobMsg(data.message || "완료");
    setTimeout(() => setJobMsg(""), 5000);
  };

  const saveFilter = async (likes: number, views: number) => {
    if (!productId) return;
    await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "product", data: { id: productId, min_likes: likes, min_views: views } }),
    });
  };

  // 수동 등록 핸들러
  const handleRegister = async () => {
    if (!regInput.trim()) return;
    setRegLoading(true);
    setRegMsg(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: regInput, source_role: regRole }),
      });
      const data = await res.json();
      if (res.ok) {
        const isUrl = data.isUrl;
        setRegMsg({ type: "ok", text: isUrl ? "URL 등록 완료 (본문 추출 대기 중)" : "소재 등록 완료" });
        setRegInput("");
        load();
      } else {
        setRegMsg({ type: "err", text: data.error || "등록 실패" });
      }
    } catch {
      setRegMsg({ type: "err", text: "네트워크 오류" });
    }
    setRegLoading(false);
  };

  // 개별 삭제 핸들러
  const handleDelete = async (id: string) => {
    if (!confirm("이 소재를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/sources?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  // 전체 삭제 핸들러
  const handleDeleteAll = async () => {
    if (!confirm(`소재 ${total}개를 전부 삭제합니다. 정말 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/sources?all=true", { method: "DELETE" });
    if (res.ok) { setPage(0); load(); }
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
          <button onClick={() => triggerJob("analyze_feed")} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer">피드 분석</button>
          <button onClick={() => triggerJob("analyze_keyword")} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer">키워드 분석</button>
          <button onClick={triggerExtract} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer">🔄 추출 실행</button>
          <button onClick={() => { setShowModal(true); setRegMsg(null); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">+ 수동 등록</button>
          {total > 0 && <button onClick={handleDeleteAll} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">전체 삭제</button>}
        </div>
      </div>

      {/* 스캔 필터 설정 */}
      <div className="border rounded-lg p-4 bg-card flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">최소 좋아요</label>
          <input type="number" value={minLikes} onChange={e => { const v = parseInt(e.target.value) || 0; setMinLikes(v); saveFilter(v, minViews); }}
            className="w-20 px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground text-center focus:outline-none focus:border-foreground transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">최소 조회수</label>
          <input type="number" value={minViews} onChange={e => { const v = parseInt(e.target.value) || 0; setMinViews(v); saveFilter(minLikes, v); }}
            className="w-24 px-2 py-1 border border-input rounded-md text-sm bg-background text-foreground text-center focus:outline-none focus:border-foreground transition-colors" />
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
                <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground w-10"></th>
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
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive text-xs border-none bg-transparent cursor-pointer transition-colors" title="삭제">✕</button>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">소재가 없습니다.</td></tr>
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

      {/* 수동 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-card border rounded-xl p-6 w-full max-w-lg shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-card-foreground">수동 소재 등록</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg border-none bg-transparent cursor-pointer">✕</button>
            </div>

            <textarea
              value={regInput}
              onChange={e => setRegInput(e.target.value)}
              placeholder="URL 또는 텍스트를 입력하세요&#10;&#10;예: https://www.threads.net/@user/post/...&#10;예: 네이버 플레이스 순위 올리는 핵심 비법은..."
              rows={5}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground resize-none focus:outline-none focus:border-foreground transition-colors"
            />

            {regInput.trim().startsWith("http") && (
              <p className="text-xs text-muted-foreground">🔗 URL 감지됨 — 등록 후 VPS에서 본문을 자동 추출합니다</p>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-2">이 소재의 용도를 선택하세요:</p>
              <div className="flex gap-2">
                {([
                  { value: "content" as const, label: "📝 내용 소재", desc: "글 주제/내용의 바탕" },
                  { value: "pattern" as const, label: "🎯 패턴 소재", desc: "글 구조/스타일 참고" },
                  { value: "both" as const, label: "📝🎯 둘 다", desc: "내용 + 패턴" },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRegRole(opt.value)}
                    className={`flex-1 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      regRole === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-input bg-background text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {regMsg && (
              <p className={`text-xs px-3 py-2 rounded-md ${
                regMsg.type === "ok" ? "bg-success/20 text-success-foreground" : "bg-destructive/20 text-destructive-foreground"
              }`}>{regMsg.text}</p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm border-none cursor-pointer hover:bg-accent transition-colors">취소</button>
              <button
                onClick={handleRegister}
                disabled={regLoading || !regInput.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
              >{regLoading ? "등록 중..." : "등록"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
