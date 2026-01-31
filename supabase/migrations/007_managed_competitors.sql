-- Create managed_competitors table
create table if not exists public.managed_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('naver', 'google')),
  place_id text not null,
  place_name text not null,
  address text,
  lat double precision,
  lng double precision,
  locked_until timestamptz, -- Date until which this competitor cannot be removed/changed
  created_at timestamptz default now(),
  
  -- Constraint: Prevent duplicate competitor for same user/platform
  unique(user_id, platform, place_id)
);

-- Enable RLS
alter table public.managed_competitors enable row level security;

-- Policies
create policy "Users can view their own competitors"
  on public.managed_competitors for select
  using (auth.uid() = user_id);

create policy "Users can insert their own competitors"
  on public.managed_competitors for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own competitors"
  on public.managed_competitors for delete
  using (auth.uid() = user_id);

-- create policy "Users can update their own competitors" -- typically just delete and re-add if needed, but we can allow update
create policy "Users can update their own competitors"
  on public.managed_competitors for update
  using (auth.uid() = user_id);
