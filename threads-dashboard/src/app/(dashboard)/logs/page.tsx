"use client";
import { useEffect, useState, useCallback } from "react";

interface Job {
  id: string; job_type: string; status: string; params: Record<string, unknown>;
  created_at: string; started_at: string | null; completed_at: string | null; error_message: string | null;
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
  extract_youtube: "유튜브 추출", extract_threads: "스레드 추출", extract_web: "웹 추출",
};

export default function LogsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/jobs?pageSize=50");
    const data = await res.json();
    setJobs(data.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">작업 로그 ({jobs.length})</h2>
        <button onClick={load} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer">새로고침</button>
      </div>

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
  );
}
