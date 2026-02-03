-- =============================================
-- Migration: 013_dispatch_queue.sql
-- Purpose: Sliding Window Queue System (Max 20 Concurrent Jobs)
-- =============================================

-- Configuration constant
CREATE OR REPLACE FUNCTION get_max_concurrent_jobs()
RETURNS INTEGER AS $$
BEGIN
    RETURN 20;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- RPC Function: dispatch_pending_searches
-- Atomically selects pending jobs and marks them as processing
-- Uses FOR UPDATE SKIP LOCKED to prevent race conditions
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
    RETURN QUERY
    WITH selected_jobs AS (
        SELECT s.id
        FROM searches s
        WHERE s.status = 'pending'
        ORDER BY s.created_at ASC
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

-- =============================================
-- RPC Function: cleanup_zombie_jobs
-- Marks jobs stuck in 'processing' for too long as 'failed'
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_zombie_jobs(timeout_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    WITH zombies AS (
        UPDATE searches
        SET status = 'failed',
            updated_at = NOW()
        WHERE status = 'processing'
          AND updated_at < NOW() - (timeout_minutes || ' minutes')::INTERVAL
        RETURNING id
    )
    SELECT COUNT(*) INTO cleaned_count FROM zombies;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RPC Function: rollback_to_pending
-- Rolls back a job from 'processing' to 'pending' (for failed GitHub calls)
-- =============================================
CREATE OR REPLACE FUNCTION rollback_to_pending(p_search_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE searches
    SET status = 'pending',
        updated_at = NOW()
    WHERE id = p_search_id
      AND status = 'processing';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dispatch_pending_searches() TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_pending_searches() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_zombie_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION rollback_to_pending(UUID) TO service_role;
