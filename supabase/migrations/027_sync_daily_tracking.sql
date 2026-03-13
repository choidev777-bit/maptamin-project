-- =============================================
-- Migration: 027_sync_daily_tracking.sql
-- Purpose: 일간 트래킹 시스템 마이그레이션 대응
-- =============================================

-- 1. searches.report_type CHECK에 'daily' 추가
ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_report_type_check;
ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
  CHECK (report_type IN ('daily', 'weekly', 'realtime', 'welcome'));

-- 2. notification_logs.type CHECK에 'daily' 추가
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'notification_logs'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notification_logs DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN ('welcome', 'daily', 'weekly', 'realtime'));

-- 3. plans 테이블 확정 플랜 기준으로 업데이트
UPDATE plans SET price=9900, monthly_tickets_naver=2, monthly_tickets_google=0,
  max_keywords_naver=2, max_keywords_google=0, max_competitors=0, max_grid_size=3
WHERE id='starter';
UPDATE plans SET price=29000, monthly_tickets_naver=5, monthly_tickets_google=0,
  max_keywords_naver=5, max_keywords_google=0, max_competitors=5, max_grid_size=5
WHERE id='pro';
UPDATE plans SET price=79000, monthly_tickets_naver=10, monthly_tickets_google=10,
  max_keywords_naver=5, max_keywords_google=5, max_competitors=-1,
  max_grid_size=7, channels='naver+google'
WHERE id='premium';

-- 4. search_schedules.crawling_days 기본값 변경 (기존 '{1,2,3,4,5,6,7}' → '{}')
ALTER TABLE search_schedules ALTER COLUMN crawling_days SET DEFAULT '{}';

-- 5. get_max_concurrent_jobs 파일 동기화 (DB는 이미 70)
CREATE OR REPLACE FUNCTION get_max_concurrent_jobs()
RETURNS INTEGER AS $$ BEGIN RETURN 70; END; $$ LANGUAGE plpgsql IMMUTABLE;
