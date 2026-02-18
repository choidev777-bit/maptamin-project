-- Remove locked_until from managed_keywords as we now use managed_places.locked_until
alter table public.managed_keywords drop column if exists locked_until;

-- Create function to check lock status
create or replace function public.check_keyword_lock()
returns trigger as $$
declare
  place_lock timestamptz;
  target_platform text;
  target_user uuid;
begin
  if TG_OP = 'DELETE' then
    target_platform := OLD.platform;
    target_user := OLD.user_id;
  else
    target_platform := NEW.platform;
    target_user := NEW.user_id;
  end if;

  select locked_until into place_lock
  from public.managed_places
  where user_id = target_user
    and platform = target_platform;

  if place_lock is not null and place_lock > now() then
    raise exception 'Cannot modify keywords while place is locked until %', place_lock;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists enforce_keyword_lock on public.managed_keywords;
create trigger enforce_keyword_lock
  before insert or update or delete on public.managed_keywords
  for each row execute function public.check_keyword_lock();
