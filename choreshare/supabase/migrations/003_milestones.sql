-- ============================================================
-- ChoreShare: Milestone rewards (里程碑解锁)
-- Run in Supabase Dashboard → SQL Editor
--
-- rewards.milestone_condition examples:
--   {"type": "streak_days",        "target": 7}    连续 7 天有任务被确认完成
--   {"type": "monthly_completion", "target": 100}  上个自然月完成率 ≥ 100%
--   {"type": "total_tasks",        "target": 50}   累计完成 50 个任务
--   {"type": "total_points",       "target": 500}  累计获得 500 积分
--
-- An unlock is stored as a redemption with points_spent = 0 and a
-- period_key, so the existing "待履行" flow and history just work.
-- ============================================================

alter table public.redemptions add column if not exists period_key text;
alter table public.redemptions add column if not exists seen_at timestamptz;

-- one unlock per reward / user / period
create unique index if not exists redemptions_milestone_once
  on public.redemptions (reward_id, user_id, period_key)
  where period_key is not null;

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.safe_tz(p_tz text)
returns text language sql stable as $$
  select case when exists (select 1 from pg_timezone_names where name = p_tz) then p_tz else 'UTC' end
$$;

-- Streaks of consecutive days (in p_tz) on which the user had a task approved
create or replace function public.user_streaks(p_user uuid, p_tz text)
returns table (start_day date, end_day date, len int)
language sql stable security definer set search_path = public as $$
  select min(d), max(d), count(*)::int
  from (
    select d, d - (row_number() over (order by d))::int as grp
    from (
      select distinct (r.created_at at time zone p_tz)::date as d
      from task_reviews r
      where r.status = 'approved' and r.earned_by = p_user
    ) days
  ) x
  group by grp
$$;

-- Completion rate (0-100) of tasks assigned to the user, due within [p_from, p_to]
create or replace function public.user_completion(p_user uuid, p_family uuid, p_from date, p_to date)
returns numeric language sql stable security definer set search_path = public as $$
  select case when count(*) = 0 then null
              else round(count(*) filter (where status = 'completed') * 100.0 / count(*), 1) end
  from tasks
  where family_id = p_family and assigned_to = p_user and due_date between p_from and p_to
$$;

-- ============================================================
-- Detect & unlock. Safe to call often (idempotent); returns new unlocks.
-- ============================================================
create or replace function public.check_milestones(p_tz text default 'UTC')
returns setof public.redemptions
language plpgsql security definer set search_path = public as $$
declare
  fam uuid := public.user_family_id();
  tz text := public.safe_tz(p_tz);
  today date;
  rw public.rewards;
  member uuid;
  kind text;
  target numeric;
  created date;
  keys text[];
  k text;
  m_start date;
  m_end date;
  rate numeric;
  red public.redemptions;
begin
  if fam is null then return; end if;
  today := (now() at time zone tz)::date;

  for rw in
    select * from rewards where family_id = fam and reward_type = 'milestone' and is_active
  loop
    kind := rw.milestone_condition->>'type';
    target := coalesce((rw.milestone_condition->>'target')::numeric, 0);
    created := (rw.created_at at time zone tz)::date;
    if target <= 0 then continue; end if;

    for member in select id from profiles where family_id = fam loop
      keys := null;

      if kind = 'streak_days' then
        -- every streak long enough that is still going on / ended after the reward existed
        select array_agg('streak:' || s.start_day) into keys
        from public.user_streaks(member, tz) s
        where s.len >= target and s.end_day >= created;

      elsif kind = 'monthly_completion' then
        -- evaluate the last full calendar month
        m_start := (date_trunc('month', today) - interval '1 month')::date;
        m_end := (date_trunc('month', today) - interval '1 day')::date;
        if m_end >= created then
          rate := public.user_completion(member, fam, m_start, m_end);
          if rate is not null and rate >= target then
            keys := array['month:' || to_char(m_start, 'YYYY-MM')];
          end if;
        end if;

      elsif kind = 'total_tasks' then
        if (select count(*) from task_reviews
            where status = 'approved' and earned_by = member) >= target then
          keys := array['once'];
        end if;

      elsif kind = 'total_points' then
        if (select coalesce(sum(points_awarded), 0) from task_reviews
            where status = 'approved' and earned_by = member) >= target then
          keys := array['once'];
        end if;
      end if;

      if keys is not null then
        foreach k in array keys loop
          red := null;
          insert into redemptions (reward_id, user_id, points_spent, period_key)
          values (rw.id, member, 0, k)
          on conflict (reward_id, user_id, period_key) where period_key is not null do nothing
          returning * into red;
          if red.id is not null then return next red; end if;
        end loop;
      end if;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- Progress toward each milestone, for the UI
--   streak_days:        current streak (alive if last day is today/yesterday)
--   monthly_completion: this month so far (tasks due up to today)
--   total_*:            running totals
-- ============================================================
create or replace function public.milestone_progress(p_tz text default 'UTC')
returns table (reward_id uuid, user_id uuid, progress numeric, target numeric)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  fam uuid := public.user_family_id();
  tz text := public.safe_tz(p_tz);
  today date;
  rw public.rewards;
  member uuid;
  kind text;
  val numeric;
begin
  if fam is null then return; end if;
  today := (now() at time zone tz)::date;

  for rw in
    select * from rewards where family_id = fam and reward_type = 'milestone' and is_active
  loop
    kind := rw.milestone_condition->>'type';
    for member in select id from profiles where family_id = fam loop
      val := 0;
      if kind = 'streak_days' then
        select coalesce(max(s.len), 0) into val
        from public.user_streaks(member, tz) s where s.end_day >= today - 1;
      elsif kind = 'monthly_completion' then
        val := coalesce(public.user_completion(member, fam, date_trunc('month', today)::date, today), 0);
      elsif kind = 'total_tasks' then
        select count(*) into val from task_reviews where status = 'approved' and earned_by = member;
      elsif kind = 'total_points' then
        select coalesce(sum(points_awarded), 0) into val from task_reviews
        where status = 'approved' and earned_by = member;
      end if;

      reward_id := rw.id;
      user_id := member;
      progress := val;
      target := coalesce((rw.milestone_condition->>'target')::numeric, 0);
      return next;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.user_streaks(uuid, text) from public, anon, authenticated;
revoke execute on function public.user_completion(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.check_milestones(text) to authenticated;
grant execute on function public.milestone_progress(text) to authenticated;
