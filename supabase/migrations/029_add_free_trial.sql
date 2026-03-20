-- =============================================
-- Migration: 029_add_free_trial.sql
-- Purpose: 무료 체험 1회 기능 지원
-- =============================================

-- 1. free_trial_used 컬럼 추가
ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN NOT NULL DEFAULT false;

-- 2. searches.report_type CHECK 제약조건에 'free_trial' 추가
ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_report_type_check;
ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
  CHECK (report_type IN ('daily', 'weekly', 'realtime', 'welcome', 'free_trial'));

-- 3. notification_logs.type CHECK 제약조건에 'free_trial' 추가
DO $$ DECLARE cname TEXT; BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'notification_logs'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notification_logs DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN ('welcome', 'daily', 'weekly', 'realtime', 'free_trial'));
