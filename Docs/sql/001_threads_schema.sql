-- ============================================================
-- Threads 자동화 시스템 - DB 스키마 마이그레이션
-- 실행 위치: Supabase SQL Editor
-- 날짜: 2026-03-28
-- ============================================================

-- ============================================================
-- 1. ENUM 타입 생성
-- ============================================================

CREATE TYPE threads_source_type AS ENUM (
  'threads', 'youtube_long', 'youtube_shorts', 'news', 'x', 'reddit'
);

CREATE TYPE threads_input_method AS ENUM (
  'auto', 'manual'
);

CREATE TYPE threads_pattern_type AS ENUM (
  'A', 'B', 'C', 'D'
);

CREATE TYPE threads_account AS ENUM (
  'bono', 'place'
);

CREATE TYPE threads_content_status AS ENUM (
  'draft', 'approved', 'queued', 'published', 'failed'
);

CREATE TYPE threads_job_status AS ENUM (
  'pending', 'running', 'done', 'failed', 'timeout'
);

CREATE TYPE threads_job_type AS ENUM (
  'scan_feed', 'scan_search', 'youtube_long', 'youtube_shorts', 'analyze', 'generate'
);

-- ============================================================
-- 2. 테이블 생성
-- ============================================================

-- ── threads_raw_sources (소재 원본) ──
CREATE TABLE threads_raw_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     threads_source_type NOT NULL,
  input_method    threads_input_method NOT NULL DEFAULT 'auto',
  source_url      TEXT,
  author          TEXT,
  text_content    TEXT NOT NULL,
  converted_text  TEXT,
  content_hash    TEXT UNIQUE NOT NULL,
  likes           INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  reposts         INTEGER DEFAULT 0,
  views           INTEGER,
  engagement_score FLOAT DEFAULT 0,
  category        TEXT,
  content_type    TEXT,
  hook_style      TEXT,
  ai_summary      TEXT,
  is_selected     BOOLEAN DEFAULT false,
  collected_at    TIMESTAMPTZ DEFAULT now(),
  analyzed_at     TIMESTAMPTZ
);

-- ── threads_patterns (패턴 라이브러리) ──
CREATE TABLE threads_patterns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type         threads_pattern_type NOT NULL,
  pattern_name        TEXT NOT NULL,
  hook_template       TEXT,
  body_structure      TEXT,
  cta_template        TEXT,
  example_source_ids  UUID[],
  avg_engagement      FLOAT DEFAULT 0,
  usage_count         INTEGER DEFAULT 0,
  success_rate        FLOAT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── threads_contents (생성된 콘텐츠) ──
CREATE TABLE threads_contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account         threads_account NOT NULL,
  text_content    TEXT NOT NULL,
  parent_type     threads_pattern_type NOT NULL,
  pattern_id      UUID REFERENCES threads_patterns(id) ON DELETE SET NULL,
  source_ids      UUID[],
  status          threads_content_status NOT NULL DEFAULT 'draft',
  link_eligible   BOOLEAN DEFAULT false,
  link_comment    TEXT,
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  thread_post_id  TEXT,
  engagement      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  reviewed_by     TEXT DEFAULT 'auto'
);

-- ── threads_accounts_config (계정 설정) ──
CREATE TABLE threads_accounts_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account             threads_account UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  topic               TEXT NOT NULL,
  tone                TEXT NOT NULL,
  scan_keywords       TEXT[] DEFAULT '{}',
  banned_words        TEXT[] DEFAULT '{}',
  interval_hours      INTEGER DEFAULT 2,
  daily_limit         INTEGER DEFAULT 6,
  active_hours_start  INTEGER DEFAULT 8,
  active_hours_end    INTEGER DEFAULT 23,
  is_active           BOOLEAN DEFAULT true,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── threads_product_config (제품 연동 설정) ──
CREATE TABLE threads_product_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name            TEXT NOT NULL,
  product_description     TEXT,
  product_features        TEXT[] DEFAULT '{}',
  related_topics          TEXT[] DEFAULT '{}',
  product_link            TEXT,
  link_comment_templates  TEXT[] DEFAULT '{}',
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ── threads_job_queue (대시보드→VPS 작업 트리거) ──
CREATE TABLE threads_job_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        threads_job_type NOT NULL,
  status          threads_job_status NOT NULL DEFAULT 'pending',
  params          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

-- ============================================================
-- 3. 인덱스
-- ============================================================

-- raw_sources: 자주 쓰이는 필터/정렬
CREATE INDEX idx_raw_sources_source_type ON threads_raw_sources(source_type);
CREATE INDEX idx_raw_sources_content_type ON threads_raw_sources(content_type);
CREATE INDEX idx_raw_sources_category ON threads_raw_sources(category);
CREATE INDEX idx_raw_sources_engagement ON threads_raw_sources(engagement_score DESC);
CREATE INDEX idx_raw_sources_collected_at ON threads_raw_sources(collected_at DESC);
CREATE INDEX idx_raw_sources_analyzed_at ON threads_raw_sources(analyzed_at);

-- contents: 발행 스케줄러가 자주 쿼리하는 조건
CREATE INDEX idx_contents_status ON threads_contents(status);
CREATE INDEX idx_contents_account_status ON threads_contents(account, status);
CREATE INDEX idx_contents_scheduled_at ON threads_contents(scheduled_at);

-- job_queue: 폴링 시 pending 작업 조회
CREATE INDEX idx_job_queue_status ON threads_job_queue(status);
CREATE INDEX idx_job_queue_pending ON threads_job_queue(status, created_at) WHERE status = 'pending';

-- patterns: 타입별 조회
CREATE INDEX idx_patterns_parent_type ON threads_patterns(parent_type);

-- ============================================================
-- 4. RLS 정책 (Row Level Security)
-- ============================================================
-- VPS Python은 service_role 키를 사용하므로 RLS bypass
-- Dashboard는 API Route에서 service_role 키로 server-side 호출
-- 따라서 RLS는 활성화하되, 외부 직접 접근만 차단

ALTER TABLE threads_raw_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_accounts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_product_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads_job_queue ENABLE ROW LEVEL SECURITY;

-- service_role은 자동으로 RLS bypass하므로 별도 정책 불필요
-- anon key로의 직접 접근은 정책이 없으므로 자동 차단됨

-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accounts_config_updated_at
  BEFORE UPDATE ON threads_accounts_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_product_config_updated_at
  BEFORE UPDATE ON threads_product_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. 초기 데이터 삽입
-- ============================================================

-- ── accounts_config: 2개 계정 프로필 ──
INSERT INTO threads_accounts_config (account, display_name, topic, tone, scan_keywords, banned_words)
VALUES
  (
    'bono',
    'bono_marketing',
    '자영업 소상공인 마케팅 관련 모든 정보/소식/꿀팁',
    '정중, 따사롭게',
    ARRAY['자영업', '소상공인', '마케팅', '매출', '홍보', '광고'],
    ARRAY['바이브코딩', 'AI 자동화', '프롬프트', '오픈클로']
  ),
  (
    'place',
    'place_hacker_',
    '네이버 플레이스/구글 지도 상위노출',
    '시크, 도도',
    ARRAY['네이버 플레이스', '구글 지도', '상위노출', '지도 순위', '로컬 SEO'],
    ARRAY['바이브코딩', 'AI 자동화', '프롬프트', '오픈클로']
  );

-- ── product_config: 맵타민 제품 정보 ──
INSERT INTO threads_product_config (product_name, product_description, product_features, related_topics, product_link, link_comment_templates)
VALUES (
  '맵타민 (Maptamin)',
  '로컬 비즈니스 지도 순위 추적 SaaS',
  ARRAY[
    '네이버 지도 키워드 순위 자동 추적',
    '구글 지도 키워드 순위 추적',
    '주변 경쟁업체 순위 비교',
    '순위 변동 알림'
  ],
  ARRAY[
    '네이버 지도 상위노출',
    '구글 지도 SEO',
    '로컬 SEO',
    '가게 마케팅',
    '지도 순위'
  ],
  'https://maptamin.com',
  ARRAY[
    '내 가게 순위 확인해보세요 → maptamin.com',
    '키워드별 순위 자동 추적 → maptamin.com'
  ]
);

-- ============================================================
-- 완료! 아래 쿼리로 검증하세요.
-- ============================================================
-- SELECT * FROM threads_accounts_config;
-- SELECT * FROM threads_product_config;
-- SELECT count(*) FROM threads_raw_sources;
-- SELECT count(*) FROM threads_patterns;
-- SELECT count(*) FROM threads_contents;
-- SELECT count(*) FROM threads_job_queue;
