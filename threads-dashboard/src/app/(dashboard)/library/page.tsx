"use client";
import { useEffect, useState, useCallback } from "react";

interface ContentSource {
  id: string; text_content: string; source_type: string; source_role: string;
  content_type: string | null; category: string | null; ai_summary: string | null;
  ai_key_points: string[] | null; likes: number; engagement_score: number;
  collected_at: string; analyzed_at: string | null; account: string | null;
}

interface PatternItem {
  id: string; parent_type: string; pattern_name: string;
  hook_template: string | null; body_structure: string | null; cta_template: string | null;
  avg_engagement: number; usage_count: number; success_rate: number; created_at: string;
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

export default function LibraryPage() {
  const [tab, setTab] = useState<"content" | "pattern">("content");
  const [contentSources, setContentSources] = useState<ContentSource[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [patternType, setPatternType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tab, page: String(page), pageSize: String(pageSize) });
    if (tab === "pattern" && patternType) params.set("type", patternType);
    const res = await fetch(`/api/library?${params}`);
    const data = await res.json();
    if (tab === "content") {
      setContentSources(data.data || []);
    } else {
      setPatterns(data.data || []);
    }
    setTotal(data.total || 0);
    setLoading(false);
  }, [tab, page, patternType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); setExpandedId(null); }, [tab, patternType]);

  const totalPages = Math.ceil(total / pageSize);

  const deleteItem = async (id: string, itemTab: "content" | "pattern") => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await fetch(`/api/library?tab=${itemTab}&id=${id}`, { method: "DELETE" });
    load();
  };

  const deleteAll = async () => {
    const label = tab === "content" ? "내용 소재" : "패턴 소재";
    if (!confirm(`${label} ${total}개를 전부 삭제합니다. 정말 삭제하시겠습니까?`)) return;
    await fetch(`/api/library?tab=${tab}&all=true`, { method: "DELETE" });
    setPage(0);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">라이브러리 ({total})</h2>
        {total > 0 && <button onClick={deleteAll} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">전체 삭제</button>}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border rounded-lg p-1 bg-muted w-fit">
        <button
          onClick={() => setTab("content")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-none cursor-pointer ${
            tab === "content" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground bg-transparent"
          }`}
        >📝 내용 소재</button>
        <button
          onClick={() => setTab("pattern")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-none cursor-pointer ${
            tab === "pattern" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground bg-transparent"
          }`}
        >🎯 패턴 소재</button>
      </div>

      {/* 패턴 탭 필터 */}
      {tab === "pattern" && (
        <div className="flex gap-2">
          {[{ v: "", l: "전체" }, { v: "A", l: "A · 트래픽" }, { v: "B", l: "B · 인사이트" }, { v: "C", l: "C · 라포" }, { v: "D", l: "D · 트렌드" }].map(f => (
            <button key={f.v} onClick={() => setPatternType(f.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border-none cursor-pointer ${
                patternType === f.v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >{f.l}</button>
          ))}
        </div>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><p className="text-sm text-muted-foreground">로딩 중...</p></div>
      ) : tab === "content" ? (
        /* 내용 소재 테이블 */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">타입</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">요약 / 핵심 포인트</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-16">계정</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">소스</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-20">역할</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28">수집일</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {contentSources.map(s => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <td className="px-4 py-3"><Badge type={s.content_type} /></td>
                  <td className="px-4 py-3 text-foreground">
                    <p className="font-medium text-sm">{s.ai_summary || s.text_content?.slice(0, 60)}</p>
                    {s.category && <span className="text-xs text-muted-foreground">{s.category}</span>}
                    {expandedId === s.id && s.ai_key_points && s.ai_key_points.length > 0 && (
                      <ul className="mt-2 space-y-1 list-none p-0">
                        {s.ai_key_points.map((kp, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">•</span>
                            <span>{kp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <span className="font-medium text-foreground">{s.account || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.source_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.source_role === "both" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}>{s.source_role}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.collected_at).toLocaleDateString("ko-KR")}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(s.id, "content"); }}
                      className="text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer"
                    >삭제</button>
                  </td>
                </tr>
              ))}
              {contentSources.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">내용 소재가 없습니다. 소재를 수집하고 AI 분석을 실행하세요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* 패턴 소재 카드 그리드 */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map(p => (
            <div key={p.id} className="border rounded-lg p-4 bg-card hover:border-foreground/20 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <Badge type={p.parent_type} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">사용 {p.usage_count}회 · 성공률 {(p.success_rate * 100).toFixed(0)}%</span>
                  <button
                    onClick={() => deleteItem(p.id, "pattern")}
                    className="text-xs text-destructive hover:underline bg-transparent border-none cursor-pointer"
                  >삭제</button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{p.pattern_name}</h3>
              {p.hook_template && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">🪝 훅</p>
                  <p className="text-xs text-foreground bg-muted rounded px-2 py-1">{p.hook_template}</p>
                </div>
              )}
              {p.body_structure && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">📐 구조</p>
                  <p className="text-xs text-foreground bg-muted rounded px-2 py-1">{p.body_structure}</p>
                </div>
              )}
              {p.cta_template && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">🎯 CTA</p>
                  <p className="text-xs text-foreground bg-muted rounded px-2 py-1">{p.cta_template}</p>
                </div>
              )}
            </div>
          ))}
          {patterns.length === 0 && (
            <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">패턴 소재가 없습니다. 소재를 수집하고 AI 분석을 실행하세요.</div>
          )}
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
