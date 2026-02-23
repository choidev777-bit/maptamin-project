-- ============================================
-- 중복 테스트 데이터 정리 SQL
-- ============================================
-- 사용법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run
--
-- 이 스크립트는 '테스트 쌀국수집'으로 생성된 모든 검색 데이터를 삭제합니다.
-- 삭제 후 test-data-rank-trend.sql을 1번만 실행하세요.
-- ============================================

-- 1. search_results 삭제 (searches에 CASCADE가 없을 수 있으므로 먼저 삭제)
DELETE FROM search_results
WHERE search_id IN (
    SELECT id FROM searches
    WHERE place_name = '테스트 쌀국수집'
);

-- 2. searches 삭제
DELETE FROM searches
WHERE place_name = '테스트 쌀국수집';

-- 확인
SELECT '삭제 완료! 이제 test-data-rank-trend.sql을 1번만 실행하세요.' AS message;
