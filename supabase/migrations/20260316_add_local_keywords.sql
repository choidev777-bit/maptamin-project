-- ============================================================
-- Migration: 지역명 키워드 기능 추가
-- Date: 2026-03-16
-- Plan: PLAN_local-keyword-feature.md (Phase 1)
-- ============================================================

-- 1. managed_keywords에 keyword_type 추가
--    기존 레코드는 모두 'industry' (업종 키워드)로 설정됨
ALTER TABLE managed_keywords
ADD COLUMN IF NOT EXISTS keyword_type TEXT NOT NULL DEFAULT 'industry'
CHECK (keyword_type IN ('industry', 'local'));

-- 2. searches에 local_keywords 추가 (기존 데이터는 빈 배열)
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS local_keywords TEXT[] NOT NULL DEFAULT '{}';

-- 3. search_schedules에 local_keywords 추가 (cron 자동 리포트용)
ALTER TABLE search_schedules
ADD COLUMN IF NOT EXISTS local_keywords TEXT[] NOT NULL DEFAULT '{}';

-- 4. search_results의 grid_lat/grid_lng NOT NULL 제약 해제
--    지역명 키워드는 좌표 없이 grid_index=-1로 저장되므로 NULL 허용 필요
ALTER TABLE search_results ALTER COLUMN grid_lat DROP NOT NULL;
ALTER TABLE search_results ALTER COLUMN grid_lng DROP NOT NULL;

-- ============================================================
-- Rollback (필요 시 수동 실행):
-- ALTER TABLE managed_keywords DROP COLUMN IF EXISTS keyword_type;
-- ALTER TABLE searches DROP COLUMN IF EXISTS local_keywords;
-- ALTER TABLE search_schedules DROP COLUMN IF EXISTS local_keywords;
-- ============================================================
