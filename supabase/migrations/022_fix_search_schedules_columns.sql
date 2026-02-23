-- ================================================================
-- 022_fix_search_schedules_columns.sql
-- search_schedules 테이블에 누락된 place_name, platform 컬럼 추가
-- 원인: 004에서 테이블 생성 시 해당 컬럼 없었고,
--       009의 CREATE TABLE IF NOT EXISTS가 무시되면서 컬럼이 추가되지 않음
-- ================================================================

DO $$
BEGIN
  -- place_name 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_schedules' AND column_name = 'place_name'
  ) THEN
    ALTER TABLE search_schedules ADD COLUMN place_name TEXT DEFAULT '';
  END IF;

  -- platform 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_schedules' AND column_name = 'platform'
  ) THEN
    ALTER TABLE search_schedules ADD COLUMN platform TEXT DEFAULT 'naver';
  END IF;
END $$;

-- crawling_days(레거시 배열)와 crawling_time의 NOT NULL 제약 제거
-- ERD v2.2 기준 crawling_day(단수 정수)가 주 컬럼이므로 배열은 하위호환용
ALTER TABLE search_schedules ALTER COLUMN crawling_days DROP NOT NULL;
ALTER TABLE search_schedules ALTER COLUMN crawling_time DROP NOT NULL;
