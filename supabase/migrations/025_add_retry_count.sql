-- =============================================
-- Migration: 025_add_retry_count.sql
-- Purpose: searches 테이블에 retry_count 컬럼 추가
-- 정기리포트 실패 시 자동 재시도 횟수 추적용
-- =============================================

ALTER TABLE searches
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
