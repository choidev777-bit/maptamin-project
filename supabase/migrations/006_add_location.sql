-- Add address and location columns to managed_places
alter table public.managed_places 
add column if not exists address text,
add column if not exists lat double precision,
add column if not exists lng double precision;

-- Add check constraints if needed (optional)
-- alter table public.managed_places add constraint check_lat check (lat between -90 and 90);
-- alter table public.managed_places add constraint check_lng check (lng between -180 and 180);
