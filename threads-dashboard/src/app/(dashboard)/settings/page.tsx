"use client";
import { useEffect, useState } from "react";

interface Acc { id: string; account: string; display_name: string; topic: string; tone: string; scan_keywords: string[]; banned_words: string[]; interval_hours: number; daily_limit: number; active_hours_start: number; active_hours_end: number; is_active: boolean; }
interface Prod { id: string; product_name: string; product_description: string; product_features: string[]; related_topics: string[]; product_link: string; link_comment_templates: string[]; min_likes: number; min_views: number; analyze_interval_hours: number; generate_interval_hours: number; }

function Tags({ tags, onChange, ph }: { tags: string[]; onChange: (t: string[]) => void; ph: string }) {
  const [v, setV] = useState("");
  const kd = (e: React.KeyboardEvent) => { if (e.key === "Enter" && v.trim()) { e.preventDefault(); if (!tags.includes(v.trim())) onChange([...tags, v.trim()]); setV(""); } };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-full">
            {t}<button onClick={() => onChange(tags.filter(x => x !== t))} className="text-muted-foreground hover:text-foreground ml-0.5 bg-transparent border-none cursor-pointer text-sm p-0">×</button>
          </span>
        ))}
      </div>
      <input type="text" value={v} onChange={e => setV(e.target.value)} onKeyDown={kd} placeholder={ph}
        className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors" />
    </div>
  );
}

export default function SettingsPage() {
  const [accs, setAccs] = useState<Acc[]>([]);
  const [prod, setProd] = useState<Prod | null>(null);
  const [ld, setLd] = useState(true);
  const [sv, setSv] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetch("/api/settings").then(r => r.json()).then(d => { setAccs(d.accounts || []); setProd(d.product || null); setLd(false); }).catch(() => setLd(false)); }, []);

  const saveAcc = async (a: Acc) => { setSv(true); setMsg(""); const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "account", data: a }) }); setSv(false); setMsg(r.ok ? "저장 완료" : "저장 실패"); setTimeout(() => setMsg(""), 2000); };
  const saveProd = async () => { if (!prod) return; setSv(true); setMsg(""); const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "product", data: prod }) }); setSv(false); setMsg(r.ok ? "저장 완료" : "저장 실패"); setTimeout(() => setMsg(""), 2000); };
  const upd = (id: string, f: string, v: unknown) => setAccs(p => p.map(a => a.id === id ? { ...a, [f]: v } : a));

  if (ld) return <div className="flex items-center justify-center h-64"><p className="text-sm text-muted-foreground">로딩 중...</p></div>;

  const inp = "w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:border-foreground transition-colors";

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">설정</h2>
        {msg && <span className={`text-xs px-3 py-1 rounded-full ${msg === "저장 완료" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>{msg}</span>}
      </div>

      {accs.map(a => (
        <div key={a.id} className="border rounded-lg p-6 space-y-5 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">@{a.display_name}</h3>
              <p className="text-xs text-muted-foreground">{a.account === "bono" ? "자영업 마케팅" : "플레이스 SEO"}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={a.is_active} onChange={e => upd(a.id, "is_active", e.target.checked)} className="w-4 h-4" style={{ accentColor: "#111" }} />
              활성화
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-muted-foreground mb-1">주제</label><input type="text" value={a.topic} onChange={e => upd(a.id, "topic", e.target.value)} className={inp} /></div>
            <div><label className="block text-xs text-muted-foreground mb-1">말투</label><input type="text" value={a.tone} onChange={e => upd(a.id, "tone", e.target.value)} className={inp} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs text-muted-foreground mb-1">발행 간격 (시간)</label><input type="number" value={a.interval_hours} onChange={e => upd(a.id, "interval_hours", parseInt(e.target.value) || 2)} className={inp} /></div>
            <div><label className="block text-xs text-muted-foreground mb-1">일일 최대</label><input type="number" value={a.daily_limit} onChange={e => upd(a.id, "daily_limit", parseInt(e.target.value) || 6)} className={inp} /></div>
            <div><label className="block text-xs text-muted-foreground mb-1">활동 시간</label>
              <div className="flex items-center gap-1">
                <input type="number" value={a.active_hours_start} onChange={e => upd(a.id, "active_hours_start", parseInt(e.target.value) || 8)} className={`${inp} !w-16 text-center`} />
                <span className="text-xs text-muted-foreground">~</span>
                <input type="number" value={a.active_hours_end} onChange={e => upd(a.id, "active_hours_end", parseInt(e.target.value) || 23)} className={`${inp} !w-16 text-center`} />
                <span className="text-xs text-muted-foreground">시</span>
              </div>
            </div>
          </div>

          <div><label className="block text-xs text-muted-foreground mb-1">스캔 키워드 (Enter로 추가)</label><Tags tags={a.scan_keywords || []} onChange={t => upd(a.id, "scan_keywords", t)} ph="키워드 입력..." /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">금지어 (Enter로 추가)</label><Tags tags={a.banned_words || []} onChange={t => upd(a.id, "banned_words", t)} ph="금지어 입력..." /></div>
          <div className="flex justify-end">
            <button onClick={() => saveAcc(a)} disabled={sv} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 border-none cursor-pointer">{sv ? "저장 중..." : "저장"}</button>
          </div>
        </div>
      ))}

      {prod && (
        <div className="border rounded-lg p-6 space-y-5 bg-card">
          <h3 className="text-sm font-semibold text-card-foreground">제품 연동</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs text-muted-foreground mb-1">제품명</label><input type="text" value={prod.product_name} onChange={e => setProd({ ...prod, product_name: e.target.value })} className={inp} /></div>
            <div><label className="block text-xs text-muted-foreground mb-1">링크</label><input type="text" value={prod.product_link} onChange={e => setProd({ ...prod, product_link: e.target.value })} className={inp} /></div>
          </div>
          <div><label className="block text-xs text-muted-foreground mb-1">설명</label><textarea value={prod.product_description || ""} onChange={e => setProd({ ...prod, product_description: e.target.value })} rows={2} className={`${inp} resize-none`} /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">제품 기능 (Enter로 추가)</label><Tags tags={prod.product_features || []} onChange={t => setProd({ ...prod, product_features: t })} ph="기능 입력..." /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">관련 토픽 (Enter로 추가)</label><Tags tags={prod.related_topics || []} onChange={t => setProd({ ...prod, related_topics: t })} ph="토픽 입력..." /></div>
          <div><label className="block text-xs text-muted-foreground mb-1">댓글 문구 템플릿 (Enter로 추가)</label><Tags tags={prod.link_comment_templates || []} onChange={t => setProd({ ...prod, link_comment_templates: t })} ph="댓글 문구 입력..." /></div>

          <div className="border-t pt-5 mt-2">
            <h4 className="text-xs font-semibold text-card-foreground mb-3">자동화 설정</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-muted-foreground mb-1">AI 분석 간격 (시간)</label><input type="number" value={prod.analyze_interval_hours} onChange={e => setProd({ ...prod, analyze_interval_hours: parseInt(e.target.value) || 8 })} className={inp} /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">콘텐츠 생성 간격 (시간)</label><input type="number" value={prod.generate_interval_hours} onChange={e => setProd({ ...prod, generate_interval_hours: parseInt(e.target.value) || 12 })} className={inp} /></div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveProd} disabled={sv} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 border-none cursor-pointer">{sv ? "저장 중..." : "저장"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
