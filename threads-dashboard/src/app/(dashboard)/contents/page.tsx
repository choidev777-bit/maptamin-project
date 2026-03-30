"use client";
import { useEffect, useState, useCallback } from "react";

interface Content {
  id: string; account: string; text_content: string; parent_type: string;
  status: string; link_eligible: boolean; link_comment: string | null;
  scheduled_at: string | null; published_at: string | null; created_at: string;
  engagement: Record<string, number>;
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  approved: "bg-type-b text-type-b-foreground",
  queued: "bg-type-a text-type-a-foreground",
  published: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "초안", approved: "승인됨", queued: "발행 대기", published: "발행됨", failed: "실패",
};
const TYPE_LABELS: Record<string, string> = { A: "트래픽", B: "인사이트", C: "라포", D: "트렌드" };

export default function ContentsPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", account: "", parent_type: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [jobMsg, setJobMsg] = useState("");
  const [generateInterval, setGenerateInterval] = useState(12);
  const [generateCount, setGenerateCount] = useState(3);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filter.status) params.set("status", filter.status);
    if (filter.account) params.set("account", filter.account);
    if (filter.parent_type) params.set("parent_type", filter.parent_type);
    const res = await fetch(`/api/contents?${params}`);
    const data = await res.json();
    setContents(data.data || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.product) setGenerateInterval(d.product.generate_interval_hours ?? 12);
    }).catch(() => {});
  }, []);

  const triggerJob = async (type: string) => {
    setJobMsg("");
    const params = type === "generate" ? { count: generateCount } : undefined;
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_type: type, params }) });
    const data = await res.json();
    setJobMsg(res.ok ? `${type} 작업 등록 완료` : data.error || "실패");
    setTimeout(() => setJobMsg(""), 3000);
  };

  const updateStatus = async (id: string, status: string, text_content?: string) => {
    const body: Record<string, string> = { id, status };
    if (text_content !== undefined) body.text_content = text_content;
    await fetch("/api/contents", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setEditId(null);
    load();
  };

  const deleteContent = async (id: string) => {
    await fetch(`/api/contents?id=${id}`, { method: "DELETE" });
    load();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">콘텐츠 ({total})</h2>
        <div className="flex items-center gap-2">
          {jobMsg && <span className="text-xs px-3 py-1 rounded-full bg-success text-success-foreground">{jobMsg}</span>}
          <span className="text-xs text-muted-foreground">{generateInterval}시간마다 자동 생성</span>
          <label className="text-xs text-muted-foreground">타입당</label>
          <input type="number" min={1} max={20} value={generateCount} onChange={e => setGenerateCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 px-2 py-1 border rounded-md text-xs text-center" />
          <span className="text-xs text-muted-foreground">개</span>
          <button onClick={() => triggerJob("generate")} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:opacity-90 transition-opacity border-none cursor-pointer">콘텐츠 생성</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">전체 상태</option>
          <option value="draft">초안</option>
          <option value="approved">승인됨</option>
          <option value="queued">발행 대기</option>
          <option value="published">발행됨</option>
          <option value="failed">실패</option>
        </select>
        <select value={filter.account} onChange={e => { setFilter(f => ({ ...f, account: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">전체 계정</option>
          <option value="bono">@bono_marketing</option>
          <option value="place">@place_hacker_</option>
        </select>
        <select value={filter.parent_type} onChange={e => { setFilter(f => ({ ...f, parent_type: e.target.value })); setPage(0); }}
          className="px-3 py-1.5 border border-input rounded-md text-sm bg-background text-foreground">
          <option value="">전체 타입</option>
          <option value="A">A · 트래픽</option>
          <option value="B">B · 인사이트</option>
          <option value="C">C · 라포</option>
          <option value="D">D · 트렌드</option>
        </select>
      </div>

      {/* Content Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><p className="text-sm text-muted-foreground">로딩 중...</p></div>
      ) : contents.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">생성된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map(c => (
            <div key={c.id} className="border rounded-lg p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
                  <span className="text-xs text-muted-foreground">@{c.account === "bono" ? "bono_marketing" : "place_hacker_"}</span>
                  <span className="text-xs text-muted-foreground">{c.parent_type} · {TYPE_LABELS[c.parent_type]}</span>
                  {c.link_eligible && <span className="text-xs px-2 py-0.5 rounded-full bg-type-a text-type-a-foreground">링크</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("ko-KR")}</span>
              </div>

              {editId === c.id ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground resize-none focus:outline-none focus:border-foreground" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs border-none cursor-pointer">취소</button>
                    <button onClick={() => updateStatus(c.id, c.status, editText)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs border-none cursor-pointer">저장</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text_content}</p>
              )}

              {c.link_comment && <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">댓글: {c.link_comment}</p>}

              {/* Actions */}
              {c.status === "draft" && editId !== c.id && (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditId(c.id); setEditText(c.text_content); }} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs border-none cursor-pointer hover:bg-accent">수정</button>
                  <button onClick={() => deleteContent(c.id)} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs border-none cursor-pointer">삭제</button>
                  <button onClick={() => updateStatus(c.id, "approved")} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs border-none cursor-pointer">승인</button>
                </div>
              )}
              {c.status === "approved" && (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => updateStatus(c.id, "queued")} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs border-none cursor-pointer">발행 대기열에 추가</button>
                </div>
              )}
            </div>
          ))}
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
