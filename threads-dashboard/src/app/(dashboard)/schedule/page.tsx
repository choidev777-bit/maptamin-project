"use client";
import { useEffect, useState } from "react";

interface Schedule { days: number[]; times: string[]; }
interface Prod { id: string; schedule_scan_feed: Schedule; schedule_scan_search: Schedule; schedule_analyze: Schedule; schedule_generate: Schedule; schedule_youtube: Schedule; youtube_max_results: number; [key: string]: Schedule | string | number; }

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

const JOBS: { key: keyof Pick<Prod, "schedule_scan_feed" | "schedule_scan_search" | "schedule_analyze" | "schedule_generate" | "schedule_youtube">; label: string; desc: string }[] = [
  { key: "schedule_scan_feed", label: "피드 스캔", desc: "Threads 피드 자동 수집" },
  { key: "schedule_scan_search", label: "키워드 스캔", desc: "Threads 키워드 검색 수집" },
  { key: "schedule_analyze", label: "AI 분석", desc: "미분석 소재 자동 분류" },
  { key: "schedule_generate", label: "콘텐츠 생성", desc: "AI 글 자동 생성" },
  { key: "schedule_youtube", label: "유튜브 스캔", desc: "YouTube 롱폼 자동 수집" },
];

const defaultSchedule: Schedule = { days: [], times: [] };

export default function SchedulePage() {
  const [prod, setProd] = useState<Prod | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.product) {
        const p = d.product;
        setProd({
          id: p.id,
          schedule_scan_feed: p.schedule_scan_feed || defaultSchedule,
          schedule_scan_search: p.schedule_scan_search || defaultSchedule,
          schedule_analyze: p.schedule_analyze || defaultSchedule,
          schedule_generate: p.schedule_generate || defaultSchedule,
          schedule_youtube: p.schedule_youtube || defaultSchedule,
          youtube_max_results: p.youtube_max_results || 15,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleDay = (key: string, day: number) => {
    if (!prod) return;
    const schedule = prod[key] as Schedule;
    const days = schedule.days.includes(day) ? schedule.days.filter((d: number) => d !== day) : [...schedule.days, day].sort();
    setProd({ ...prod, [key]: { ...schedule, days } });
  };

  const addTime = (key: string, time: string) => {
    if (!prod) return;
    const schedule = prod[key] as Schedule;
    if (schedule.times.includes(time)) return;
    setProd({ ...prod, [key]: { ...schedule, times: [...schedule.times, time].sort() } });
  };

  const removeTime = (key: string, time: string) => {
    if (!prod) return;
    const schedule = prod[key] as Schedule;
    setProd({ ...prod, [key]: { ...schedule, times: schedule.times.filter((t: string) => t !== time) } });
  };

  const save = async () => {
    if (!prod) return;
    setSaving(true);
    setMsg("");
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "product", data: prod }),
    });
    setSaving(false);
    setMsg(r.ok ? "저장 완료" : "저장 실패");
    setTimeout(() => setMsg(""), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;
  if (!prod) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">설정을 불러올 수 없습니다.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">스케줄 설정</h2>
          <p className="text-xs text-muted-foreground mt-1">자동화 작업의 실행 요일과 시간을 설정합니다 (KST 기준)</p>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-xs px-3 py-1 rounded-full ${msg === "저장 완료" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>{msg}</span>}
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 border-none cursor-pointer">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>

      {JOBS.map(job => {
        const schedule = prod[job.key] as Schedule;
        return (
          <div key={job.key} className="border rounded-lg p-5 bg-card space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">{job.label}</h3>
              <p className="text-xs text-muted-foreground">{job.desc}</p>
            </div>

            {/* 요일 선택 */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">요일</label>
              <div className="flex gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(job.key, i)}
                    className={`w-9 h-9 rounded-md text-xs font-medium border-none cursor-pointer transition-colors ${
                      schedule.days.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-accent"
                    }`}
                  >{d}</button>
                ))}
              </div>
            </div>

            {/* 시간 선택 */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">실행 시간</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {schedule.times.length === 0 && <span className="text-xs text-muted-foreground">설정된 시간 없음</span>}
                {schedule.times.map((t: string) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-full">
                    {t}
                    <button onClick={() => removeTime(job.key, t)} className="text-muted-foreground hover:text-foreground ml-0.5 bg-transparent border-none cursor-pointer text-sm p-0">×</button>
                  </span>
                ))}
              </div>
              <TimeAdder onAdd={(t) => addTime(job.key, t)} existing={schedule.times} />
            </div>

            {/* 유튜브 전용: 수집 개수 */}
            {job.key === "schedule_youtube" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">키워드당 수집 개수</label>
                <input
                  type="number" min={1} max={50}
                  value={prod.youtube_max_results}
                  onChange={e => setProd({ ...prod, youtube_max_results: parseInt(e.target.value) || 15 })}
                  className="w-24 px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimeAdder({ onAdd, existing }: { onAdd: (t: string) => void; existing: string[] }) {
  const [sel, setSel] = useState("05:00");
  return (
    <div className="flex items-center gap-2">
      <select
        value={sel}
        onChange={e => setSel(e.target.value)}
        className="px-3 py-1.5 border border-input rounded-md text-xs bg-background text-foreground focus:outline-none focus:border-foreground transition-colors"
      >
        {HOURS.map(h => (
          <option key={h} value={h} disabled={existing.includes(h)}>{h}</option>
        ))}
      </select>
      <button
        onClick={() => { if (!existing.includes(sel)) onAdd(sel); }}
        className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-xs font-medium hover:bg-accent transition-colors border-none cursor-pointer"
      >추가</button>
    </div>
  );
}
