
-- final_schema_fix.sql
-- Run this in Supabase SQL Editor to fully sync your local DB with the code

-- ==========================================
-- 1. Fix 'searches' table (Missing 'cost' column)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'searches' AND column_name = 'cost'
    ) THEN
        ALTER TABLE public.searches 
        ADD COLUMN cost INTEGER DEFAULT 0;
    END IF;
END $$;

-- ==========================================
-- 2. Fix 'managed_places' (Missing 'platform')
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'managed_places' AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.managed_places 
        ADD COLUMN platform text check (platform in ('naver', 'google'));
        UPDATE public.managed_places SET platform = 'naver' WHERE platform IS NULL;
        ALTER TABLE public.managed_places ALTER COLUMN platform SET NOT NULL;
    END IF;
END $$;

-- 3. Fix Constraints for managed_places
DO $$
BEGIN
    -- Drop old unique constraint if it doesn't include platform
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_places_user_id_place_id_key'
    ) THEN
        ALTER TABLE public.managed_places DROP CONSTRAINT managed_places_user_id_place_id_key;
    END IF;

    -- Add new unique constraint (user_id, platform, place_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_places_user_id_platform_place_id_key'
    ) THEN
        ALTER TABLE public.managed_places
        ADD CONSTRAINT managed_places_user_id_platform_place_id_key UNIQUE (user_id, platform, place_id);
    END IF;
END $$;

-- ==========================================
-- 4. Fix 'managed_competitors' (Missing 'platform')
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'managed_competitors' AND column_name = 'platform'
    ) THEN
        ALTER TABLE public.managed_competitors 
        ADD COLUMN platform text check (platform in ('naver', 'google'));
        UPDATE public.managed_competitors SET platform = 'naver' WHERE platform IS NULL;
        ALTER TABLE public.managed_competitors ALTER COLUMN platform SET NOT NULL;
    END IF;
END $$;

-- 5. Fix Constraints for managed_competitors
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_competitors_user_id_place_id_key'
    ) THEN
        ALTER TABLE public.managed_competitors DROP CONSTRAINT managed_competitors_user_id_place_id_key;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'managed_competitors_user_id_platform_place_id_key'
    ) THEN
        ALTER TABLE public.managed_competitors
        ADD CONSTRAINT managed_competitors_user_id_platform_place_id_key UNIQUE (user_id, platform, place_id);
    END IF;
END $$;

-- ==========================================
-- 6. Verify 'searches.keywords' type
-- ==========================================
-- This block is just a safeguard. 
-- Converting from text to text[] might fail if data is not compatible, 
-- but assuming it followed migration 001, it should be fine.
-- If you see errors here, manual intervention is needed.
