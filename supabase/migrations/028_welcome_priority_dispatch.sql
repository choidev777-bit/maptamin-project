-- =============================================
-- Migration: 028_welcome_priority_dispatch.sql
-- Purpose: 웰컴 리포트 큐 우선순위 추가
-- Change: ORDER BY에 welcome 우선 CASE문 추가
-- =============================================

CREATE OR REPLACE FUNCTION dispatch_pending_searches()
RETURNS TABLE (
    search_id UUID,
    user_id UUID,
    platform TEXT
) AS $$
DECLARE
    max_jobs INTEGER;
    active_count INTEGER;
    available_slots INTEGER;
BEGIN
    max_jobs := get_max_concurrent_jobs();
    
    -- Count currently processing jobs
    SELECT COUNT(*) INTO active_count
    FROM searches
    WHERE status = 'processing';
    
    -- Calculate available slots
    available_slots := max_jobs - active_count;
    
    -- If no slots available, return empty
    IF available_slots <= 0 THEN
        RETURN;
    END IF;
    
    -- Atomically select and update pending jobs
    -- FOR UPDATE SKIP LOCKED prevents race conditions
    -- welcome 리포트가 자동 리포트보다 먼저 배정됨
    RETURN QUERY
    WITH selected_jobs AS (
        SELECT s.id
        FROM searches s
        WHERE s.status = 'pending'
        ORDER BY
          CASE WHEN s.report_type = 'welcome' THEN 0 ELSE 1 END ASC,
          s.created_at ASC
        LIMIT available_slots
        FOR UPDATE SKIP LOCKED
    ),
    updated_jobs AS (
        UPDATE searches
        SET status = 'processing',
            updated_at = NOW()
        WHERE id IN (SELECT id FROM selected_jobs)
        RETURNING id, searches.user_id, searches.platform
    )
    SELECT uj.id, uj.user_id, uj.platform
    FROM updated_jobs uj;
END;
$$ LANGUAGE plpgsql;
