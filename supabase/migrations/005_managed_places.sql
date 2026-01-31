-- Create managed_places table
create table if not exists public.managed_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform text not null check (platform in ('naver', 'google')),
  place_id text not null,
  place_name text not null,
  locked_until timestamptz,
  created_at timestamptz default now(),
  
  -- Constraint: One place per platform per user
  unique(user_id, platform)
);

-- Enable RLS
alter table public.managed_places enable row level security;

-- Policies
create policy "Users can view their own managed places"
  on public.managed_places for select
  using (auth.uid() = user_id);

create policy "Users can insert their own managed places"
  on public.managed_places for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own managed places"
  on public.managed_places for update
  using (auth.uid() = user_id);
