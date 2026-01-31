
-- 000_fix_schema_mismatch.sql
-- Run this in your Supabase SQL Editor to fix the schema drift

-- 1. Fix managed_places table (Add missing platform column)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'managed_places' 
        AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.managed_places 
        ADD COLUMN platform text check (platform in ('naver', 'google'));
        
        -- Set default for existing rows
        UPDATE public.managed_places SET platform = 'naver' WHERE platform IS NULL;
        
        -- Enforce Not Null
        ALTER TABLE public.managed_places ALTER COLUMN platform SET NOT NULL;
    END IF;
END $$;

-- 2. Fix managed_competitors table (Add missing platform column)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'managed_competitors' 
        AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.managed_competitors 
        ADD COLUMN platform text check (platform in ('naver', 'google'));
        
        -- Set default
        UPDATE public.managed_competitors SET platform = 'naver' WHERE platform IS NULL;
        
        -- Enforce Not Null
        ALTER TABLE public.managed_competitors ALTER COLUMN platform SET NOT NULL;
    END IF;
END $$;

-- 2a. Validate/Fix Constraints on managed_competitors
DO $$
BEGIN
    -- Drop old constraint if mismatch
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_competitors_user_id_place_id_key'
    ) THEN
        ALTER TABLE public.managed_competitors DROP CONSTRAINT managed_competitors_user_id_place_id_key;
    END IF;

    -- Add new constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_competitors_user_id_platform_place_id_key'
    ) THEN
        ALTER TABLE public.managed_competitors
        ADD CONSTRAINT managed_competitors_user_id_platform_place_id_key UNIQUE (user_id, platform, place_id);
    END IF;
END $$;

-- 3. Fix daily_usage table (Add platform if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_usage' 
        AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.daily_usage
        ADD COLUMN platform text DEFAULT 'google';
        
        -- Reset unique constraint for platform
        ALTER TABLE public.daily_usage DROP CONSTRAINT IF EXISTS daily_usage_user_id_usage_date_key;
        ALTER TABLE public.daily_usage 
        ADD CONSTRAINT daily_usage_user_platform_date_key UNIQUE (user_id, usage_date, platform);
    END IF;
END $$;

-- 4. Re-create Function increments (just in case)
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
