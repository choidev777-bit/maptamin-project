-- Remove the keyword lock trigger so users can change keywords anytime

-- Drop the trigger on managed_keywords
drop trigger if exists enforce_keyword_lock on public.managed_keywords;

-- Drop the underlying function
drop function if exists public.check_keyword_lock();
