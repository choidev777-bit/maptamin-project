-- =============================================
-- Migration: 026_increase_concurrent_jobs.sql
-- Purpose: 동시 처리 수 5 → 20 (1 OCPU/6GB 기준 최적값)
-- =============================================

CREATE OR REPLACE FUNCTION get_max_concurrent_jobs()
RETURNS INTEGER AS $$
BEGIN
    RETURN 20;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
