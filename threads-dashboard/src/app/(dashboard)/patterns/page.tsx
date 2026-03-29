"use client";
import { useEffect, useState } from "react";

interface Pattern {
  id: string; parent_type: string; pattern_name: string;
  hook_template: string | null; body_structure: string | null; cta_template: string | null;
  avg_engagement: number; usage_count: number; success_rate: number; created_at: string;
}

const TABS = [
  { type: "A", label: "트래픽", style: "bg-type-a text-type-a-foreground" },
  { type: "B", label: "인사이트", style: "bg-type-b text-type-b-foreground" },
  { type: "C", label: "라포", style: "bg-type-c text-type-c-foreground" },
  { type: "D", label: "트렌드", style: "bg-type-d text-type-d-foreground" },
];

export default function PatternsPage() {
  const [activeTab, setActiveTab] = useState("A");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/patterns?type=${activeTab}`)
      .then(r => r.json())
      .then(d => { setPatterns(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">패턴 라이브러리</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button key={tab.type} onClick={() => setActiveTab(tab.type)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-none cursor-pointer ${
              activeTab === tab.type ? tab.style : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}>
            {tab.type} · {tab.label}
          </button>
        ))}
      </div>

      {/* Pattern List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><p className="text-sm text-muted-foreground">로딩 중...</p></div>
      ) : patterns.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm">아직 발견된 패턴이 없습니다.</p>
          <p className="text-muted-foreground text-xs mt-1">AI 분석 엔진이 소재를 분류한 후 패턴이 자동으로 생성됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map(p => (
            <div key={p.id} className="border rounded-lg p-5 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-card-foreground">{p.pattern_name}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>사용: {p.usage_count}회</span>
                  <span>성공률: {(p.success_rate * 100).toFixed(0)}%</span>
                  <span>참여도: {p.avg_engagement.toFixed(1)}</span>
                </div>
              </div>
              {p.hook_template && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">훅 템플릿</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md">{p.hook_template}</p>
                </div>
              )}
              {p.body_structure && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">본문 구조</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md">{p.body_structure}</p>
                </div>
              )}
              {p.cta_template && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CTA 템플릿</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md">{p.cta_template}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
