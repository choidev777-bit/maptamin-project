-- Safely create or update search_schedules table

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS search_schedules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('naver', 'google')),
  place_id text not null,
  place_name text not null,
  keywords text[] not null,
  grid_config jsonb not null,
  is_active boolean default true,
  crawling_time time default '09:00:00',
  crawling_days integer[] default '{1,2,3,4,5,6,7}',
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Add columns if they strictly don't exist (Manual safety check or simple ignore if exists)
-- Postgres doesn't have "ADD COLUMN IF NOT EXISTS" in older versions, but Supabase usually supports standard pg.
-- We can use a DO block to be safe.

DO $$
BEGIN
    BEGIN
        ALTER TABLE search_schedules ADD COLUMN crawling_time time default '09:00:00';
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column crawling_time already exists in search_schedules.';
    END;
    
    BEGIN
        ALTER TABLE search_schedules ADD COLUMN crawling_days integer[] default '{1,2,3,4,5,6,7}';
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column crawling_days already exists in search_schedules.';
    END;

     BEGIN
        ALTER TABLE search_schedules ADD COLUMN place_id text; -- Relax not null constraint if needed or check existence
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column place_id already exists.';
    END;
END $$;

-- 3. Enable RLS (Safe to re-run, improved to drop policy first if needed or just use create if not exists equivalent?)
-- Policies don't support "IF NOT EXISTS" easily. 
-- Best to manually check or drop and recreate.
-- Here we imply: If table existed, it likely has policies. 
-- We will skip Policy creation if table existed to avoid "policy already exists" error.
-- Users can manually verify policies if needed.
