-- Fix daily_usage table missing updated_at column
-- This handles the error: column "updated_at" of relation "daily_usage" does not exist

DO $$
BEGIN
    -- Check if column exists to avoid errors on run
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_usage' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.daily_usage 
        ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;
