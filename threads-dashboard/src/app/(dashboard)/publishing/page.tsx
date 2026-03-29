"use client";
import { useEffect, useState, useCallback } from "react";

interface Job {
  id: string; job_type: string; status: string; params: Record<string, unknown>;
  created_at: string; started_at: string | null; completed_at: string | null; error_message: string | null;
}

interface Content {
  id: string; account: string; text_content: string; parent_type: string;
  status: string; published_at: string | null; link_eligible: boolean;
}

const JOB_STATUS_STYLE: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  running: "bg-type-a text-type-a-foreground",
  done: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
  timeout: "bg-type-c text-type-c-foreground",
};
const JOB_TYPE_LABEL: Record<string, string> = {
  scan_feed: "피드 스캔", scan_search: "키워드 스캔",
  youtube_long: "유튜브 롱폼", youtube_shorts: "유튜브 쇼츠",
  analyze: "AI 분석", generate: "콘텐츠 생성",
};

export default function PublishingPage() {
  const [queued, setQueued] = useState<Content[]>([]);
  const [published, setPublished] = useState<Content[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [qRes, pRes, jRes] = await Promise.all([
      fetch("/api/contents?status=queued&pageSize=50"),
      fetch("/api/contents?status=published&pageSize=10"),
      fetch("/api/jobs?pageSize=10"),
    ]);
    const [qData, pData, jData] = await Promise.all([qRes.json(), pRes.json(), jRes.json()]);
    setQueued(qData.data || []);
    setPublished(pData.data || []);
    setJobs(jData.data || []);
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

      {/* Job Log */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">작업 로그</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">작업</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">상태</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">생성</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">완료</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">에러</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.id} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground text-xs">{JOB_TYPE_LABEL[j.job_type] || j.job_type}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_STYLE[j.status]}`}>{j.status}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{j.completed_at ? new Date(j.completed_at).toLocaleString("ko-KR") : "-"}</td>
                  <td className="px-4 py-3 text-xs text-destructive-foreground">{j.error_message || "-"}</td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">작업 로그가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
