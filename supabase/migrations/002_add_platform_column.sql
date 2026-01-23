-- 002_add_platform_column.sql
-- 네이버 버전 지원을 위한 platform 컬럼 추가
-- 작성일: 2026-01-20

-- ============================================
-- 1. searches 테이블에 platform 컬럼 추가
-- ============================================

-- 플랫폼 컬럼 추가 (기본값 'google'로 기존 데이터 보호)
ALTER TABLE searches 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'google';

-- 성능을 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_searches_platform ON searches(platform);
CREATE INDEX IF NOT EXISTS idx_searches_user_platform ON searches(user_id, platform);

-- ============================================
-- 2. daily_usage 테이블에 platform 컬럼 추가
-- ============================================

-- 플랫폼 컬럼 추가
ALTER TABLE daily_usage
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'google';

-- 기존 unique constraint 삭제 (존재하는 경우)
-- 주의: 이 부분은 실제 환경에서 테스트 후 적용
ALTER TABLE daily_usage
DROP CONSTRAINT IF EXISTS daily_usage_user_id_usage_date_key;

-- 새로운 unique constraint 추가 (user_id + usage_date + platform)
ALTER TABLE daily_usage
ADD CONSTRAINT daily_usage_user_platform_date_key 
UNIQUE(user_id, usage_date, platform);

-- ============================================
-- 3. increment_daily_usage 함수 수정
-- ============================================

-- 기존 함수 삭제 후 재생성 (platform 파라미터 추가)
CREATE OR REPLACE FUNCTION increment_daily_usage(
    p_user_id UUID,
    p_date DATE,
    p_platform TEXT DEFAULT 'google'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_usage (user_id, usage_date, search_count, platform)
    VALUES (p_user_id, p_date, 1, p_platform)
    ON CONFLICT (user_id, usage_date, platform)
    DO UPDATE SET search_count = daily_usage.search_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 코멘트 추가
-- ============================================

COMMENT ON COLUMN searches.platform IS 'Search platform: google or naver';
COMMENT ON COLUMN daily_usage.platform IS 'Usage tracked per platform: google or naver';
