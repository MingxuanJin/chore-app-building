-- ============================================================
-- ChoreShare: recurring tasks appear on schedule (重复任务按周期自动生成)
-- Run in Supabase Dashboard → SQL Editor
--
-- Before: the next instance was created only when the previous one was approved.
-- Now:    every instance of a series is generated on its due date,
--         independent of whether the previous one was done (PRD 2.3).
--
-- * tasks.series_id links all instances of one recurring task
-- * generate_recurring_tasks() creates the latest due instance per series
--   (missed periods are not back-filled, so nothing piles up)
-- * runs when the app opens (sync_recurring_tasks) and hourly via pg_cron,
--   the cron run only from 07:00 local time so pushes don't arrive at night
-- * sends a "task_due" notification (→ push) for each new instance
-- ============================================================

alter table public.families add column if not exists timezone text not null default 'UTC';
alter table public.tasks add column if not exists series_id uuid;
create index if not exists tasks_series_idx on public.tasks (series_id, due_date desc);

-- Backfill: group existing recurring tasks by family + title + type
update public.tasks t
set series_id = s.first_id
from (
  select id, first_value(id) over (partition by family_id, title, recurrence_type order by created_at) as first_id
  from public.tasks
  where recurrence_type <> 'none'
) s
where t.id = s.id and t.series_id is null;

-- New recurring tasks start their own series
create or replace function public.tasks_set_series()
returns trigger language plpgsql as $$
begin
  if new.series_id is null and new.recurrence_type <> 'none' then
    new.series_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_series on public.tasks;
create trigger tasks_set_series
  before insert or update on public.tasks
  for each row execute function public.tasks_set_series();

-- ============================================================
-- Generator
-- ============================================================
create or replace function public.generate_recurring_tasks(p_family uuid default null, p_any_hour boolean default true)
returns int language plpgsql security definer set search_path = public as $$
declare
  fam record;
  s record;
  tz text;
  today date;
  d date;
  nxt date;
  guard int;
  new_id uuid;
  member uuid;
  created int := 0;
begin
  for fam in select id, timezone from families where p_family is null or id = p_family loop
    tz := public.safe_tz(fam.timezone);
    if not p_any_hour and extract(hour from now() at time zone tz) < 7 then continue; end if;
    today := (now() at time zone tz)::date;

    -- app-open and cron runs may overlap: one generator per family at a time
    perform pg_advisory_xact_lock(hashtext('recurring:' || fam.id::text));

    -- the latest instance of each series carries the current settings
    for s in
      select distinct on (t.series_id) t.*
      from tasks t
      where t.family_id = fam.id and t.series_id is not null
      order by t.series_id, t.due_date desc nulls last, t.created_at desc
    loop
      continue when s.recurrence_type = 'none' or s.due_date is null;
      nxt := public.next_due_date(s.recurrence_type, s.recurrence_value, s.due_date);
      continue when nxt is null or nxt > today;

      -- skip missed periods: jump to the most recent scheduled date <= today
      d := nxt;
      guard := 0;
      loop
        nxt := public.next_due_date(s.recurrence_type, s.recurrence_value, d);
        exit when nxt is null or nxt > today or guard > 1000;
        d := nxt;
        guard := guard + 1;
      end loop;

      perform set_config('choreshare.skip_notify', 'on', true);
      insert into tasks (family_id, title, description, difficulty, estimated_minutes,
                         recurrence_type, recurrence_value, assigned_to, created_by,
                         status, due_date, series_id)
      values (s.family_id, s.title, s.description, s.difficulty, s.estimated_minutes,
              s.recurrence_type, s.recurrence_value,
              case when s.recurrence_value ? 'open' then null else s.assigned_to end,
              s.created_by,
              case when s.recurrence_value ? 'open' or s.assigned_to is null
                   then 'pending'::task_status else 'claimed'::task_status end,
              d, s.series_id)
      returning id into new_id;
      perform set_config('choreshare.skip_notify', 'off', true);

      -- "time for X today": to the assignee, or to both for open tasks
      for member in
        select p.id from profiles p
        where p.family_id = fam.id
          and (s.recurrence_value ? 'open' or s.assigned_to is null or p.id = s.assigned_to)
      loop
        perform public.notify(fam.id, member, 'task_due', new_id, null,
                              jsonb_build_object('title', s.title), true);
      end loop;

      created := created + 1;
    end loop;
  end loop;
  return created;
end;
$$;

-- Called by the app on open; also remembers the family's timezone for cron runs
create or replace function public.sync_recurring_tasks(p_tz text default 'UTC')
returns int language plpgsql security definer set search_path = public as $$
declare
  fam uuid := public.user_family_id();
begin
  if fam is null then return 0; end if;
  update families set timezone = public.safe_tz(p_tz)
  where id = fam and timezone is distinct from public.safe_tz(p_tz);
  return public.generate_recurring_tasks(fam, true);
end;
$$;

revoke execute on function public.generate_recurring_tasks(uuid, boolean) from public, anon, authenticated;
grant execute on function public.sync_recurring_tasks(text) to authenticated;

-- ============================================================
-- review_task: no longer spawns the next instance
-- ============================================================
create or replace function public.review_task(
  p_task_id uuid, p_approve boolean, p_comment text default null
) returns public.task_reviews
language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
  total_minutes numeric;
  pts int := null;
  rev public.task_reviews;
begin
  select * into t from tasks where id = p_task_id for update;
  if t.id is null or t.family_id <> public.user_family_id() then
    raise exception 'task_not_found';
  end if;
  if t.status <> 'review' then raise exception 'task_not_in_review'; end if;
  if t.assigned_to = auth.uid() then raise exception 'cannot_review_own_task'; end if;

  if p_approve then
    select coalesce(sum(actual_minutes), 0) into total_minutes
      from task_sessions where task_id = t.id and ended_at is not null;
    pts := t.difficulty * greatest(ceil(total_minutes / 15.0)::int, 1);
  end if;

  insert into task_reviews (task_id, reviewer_id, status, comment, points_awarded, earned_by)
  values (
    t.id, auth.uid(),
    case when p_approve then 'approved'::review_status else 'rejected'::review_status end,
    nullif(trim(p_comment), ''), pts,
    case when p_approve then t.assigned_to else null end
  )
  returning * into rev;

  update tasks set status = case when p_approve then 'completed'::task_status else 'rejected'::task_status end
    where id = t.id;

  -- the next instance of a recurring task is created on schedule by
  -- generate_recurring_tasks (007), not on approval

  return rev;
end;
$$;

-- ============================================================
-- Hourly cron (skipped with a notice if pg_cron isn't available;
-- the app-open sync still works without it)
-- ============================================================
do $do$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'choreshare-recurring',
    '5 * * * *',
    'select public.generate_recurring_tasks(null, false)'
  );
exception when others then
  raise notice 'pg_cron not available, skipping schedule: %', sqlerrm;
end
$do$;
