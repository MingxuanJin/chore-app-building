-- ============================================================
-- ChoreShare: Fix RLS recursion + business logic RPCs
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 0. Grants (RLS still restricts rows)
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ============================================================
-- 1. Fix infinite recursion: profiles/families policies queried
--    profiles from inside a profiles policy. Use the security
--    definer helper instead (bypasses RLS).
-- ============================================================
drop policy if exists "Users can read family members" on public.profiles;
create policy "Users can read family members"
  on public.profiles for select using (family_id = public.user_family_id());

drop policy if exists "Family members can read" on public.families;
create policy "Family members can read"
  on public.families for select using (id = public.user_family_id());

create policy "Family members can update family"
  on public.families for update using (id = public.user_family_id());

-- Rewards: allow delete (soft delete via is_active is also possible)
create policy "Family members can delete rewards"
  on public.rewards for delete using (family_id = public.user_family_id());

-- ============================================================
-- 2. Schema additions
-- ============================================================
-- Due date for task instances (recurring tasks spawn the next instance)
alter table public.tasks add column if not exists due_date date default current_date;
-- Who earned the points of an approved review
alter table public.task_reviews add column if not exists earned_by uuid references auth.users(id);
-- Shopping: when it was purchased (for sorting/archiving)
alter table public.shopping_items add column if not exists purchased_at timestamptz;

-- ============================================================
-- 3. Family RPCs
-- ============================================================
create or replace function public.create_family(family_name text default 'Our Home')
returns public.families
language plpgsql security definer set search_path = public as $$
declare
  fam public.families;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if (select family_id from profiles where id = auth.uid()) is not null then
    raise exception '你已经加入了一个家庭空间';
  end if;

  insert into families (name, created_by)
  values (coalesce(nullif(trim(family_name), ''), 'Our Home'), auth.uid())
  returning * into fam;

  update profiles set family_id = fam.id where id = auth.uid();
  return fam;
end;
$$;

create or replace function public.join_family(code text)
returns public.families
language plpgsql security definer set search_path = public as $$
declare
  fam public.families;
  member_count int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if (select family_id from profiles where id = auth.uid()) is not null then
    raise exception '你已经加入了一个家庭空间';
  end if;

  select * into fam from families where pair_code = lower(trim(code));
  if fam.id is null then raise exception '配对码无效'; end if;

  select count(*) into member_count from profiles where family_id = fam.id;
  if member_count >= 2 then raise exception '这个家庭空间已经满员了'; end if;

  update profiles set family_id = fam.id where id = auth.uid();
  return fam;
end;
$$;

-- ============================================================
-- 4. Recurrence: compute the next due date
--    recurrence_value examples:
--      every_n_days: {"interval": 3}
--      weekly:       {"days": [1,3,5]}   (0 = Sunday … 6 = Saturday)
--      monthly:      {"day": 15}
-- ============================================================
create or replace function public.next_due_date(
  r_type public.recurrence_type, r_value jsonb, from_date date
) returns date
language plpgsql immutable as $$
declare
  d date;
  i int;
  target_day int;
begin
  case r_type
    when 'daily' then
      return from_date + 1;
    when 'every_n_days' then
      return from_date + greatest(coalesce((r_value->>'interval')::int, 1), 1);
    when 'weekly' then
      for i in 1..7 loop
        d := from_date + i;
        if r_value->'days' @> to_jsonb(extract(dow from d)::int) then
          return d;
        end if;
      end loop;
      return from_date + 7;
    when 'monthly' then
      target_day := coalesce((r_value->>'day')::int, extract(day from from_date)::int);
      d := (date_trunc('month', from_date) + interval '1 month')::date;
      -- clamp to last day of month (e.g. 31 → 30 / 28)
      return least(
        d + (target_day - 1),
        (date_trunc('month', d) + interval '1 month - 1 day')::date
      );
    else
      return null;
  end case;
end;
$$;

-- ============================================================
-- 5. Review a submitted task (approve → points + next instance)
--    积分 = 难度 × ceil(实际用时分钟 / 15)，最少 1 个计时单位
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
    raise exception '任务不存在';
  end if;
  if t.status <> 'review' then raise exception '任务不在待确认状态'; end if;
  if t.assigned_to = auth.uid() then raise exception '不能确认自己的任务，请让对方确认'; end if;

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

  -- Spawn the next instance for recurring tasks
  if p_approve and t.recurrence_type <> 'none' then
    insert into tasks (family_id, title, description, difficulty, estimated_minutes,
                       recurrence_type, recurrence_value, assigned_to, created_by, status, due_date)
    values (t.family_id, t.title, t.description, t.difficulty, t.estimated_minutes,
            t.recurrence_type, t.recurrence_value,
            -- keep the original assignment mode: assigned tasks stay assigned
            case when t.recurrence_value ? 'open' then null else t.assigned_to end,
            t.created_by,
            case when t.recurrence_value ? 'open' then 'pending'::task_status else 'claimed'::task_status end,
            public.next_due_date(t.recurrence_type, t.recurrence_value,
                                 greatest(coalesce(t.due_date, current_date), current_date)));
  end if;

  return rev;
end;
$$;

-- ============================================================
-- 6. Points
-- ============================================================
create or replace function public.family_points()
returns table (user_id uuid, total_earned bigint, total_spent bigint, balance bigint)
language sql security definer stable set search_path = public as $$
  select p.id,
         coalesce(e.earned, 0),
         coalesce(s.spent, 0),
         coalesce(e.earned, 0) - coalesce(s.spent, 0)
  from profiles p
  left join (
    select r.earned_by, sum(r.points_awarded) as earned
    from task_reviews r
    where r.status = 'approved' and r.earned_by is not null
    group by r.earned_by
  ) e on e.earned_by = p.id
  left join (
    select rd.user_id, sum(rd.points_spent) as spent
    from redemptions rd group by rd.user_id
  ) s on s.user_id = p.id
  where p.family_id = public.user_family_id();
$$;

create or replace function public.redeem_reward(p_reward_id uuid)
returns public.redemptions
language plpgsql security definer set search_path = public as $$
declare
  rw public.rewards;
  bal bigint;
  red public.redemptions;
begin
  select * into rw from rewards where id = p_reward_id;
  if rw.id is null or rw.family_id <> public.user_family_id() or not rw.is_active then
    raise exception '奖励不存在';
  end if;
  if rw.reward_type <> 'redeem' or rw.cost_points is null then
    raise exception '该奖励不能用积分兑换';
  end if;

  -- serialize redemptions per user to avoid double spending
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select fp.balance into bal from public.family_points() fp where fp.user_id = auth.uid();
  if coalesce(bal, 0) < rw.cost_points then
    raise exception '积分不足（当前 %，需要 %）', coalesce(bal, 0), rw.cost_points;
  end if;

  insert into redemptions (reward_id, user_id, points_spent)
  values (rw.id, auth.uid(), rw.cost_points)
  returning * into red;
  return red;
end;
$$;

-- Redemptions must go through redeem_reward (prevents faking points_spent)
drop policy if exists "Family members can manage redemptions" on public.redemptions;
create policy "Family members can read redemptions"
  on public.redemptions for select using (
    reward_id in (select id from public.rewards where family_id = public.user_family_id())
  );
create policy "Family members can fulfill redemptions"
  on public.redemptions for update using (
    reward_id in (select id from public.rewards where family_id = public.user_family_id())
  );

-- Reviews must go through review_task (prevents self-awarded points)
drop policy if exists "Family members can manage reviews" on public.task_reviews;
create policy "Family members can read reviews"
  on public.task_reviews for select using (
    task_id in (select id from public.tasks where family_id = public.user_family_id())
  );

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.review_task(uuid, boolean, text) to authenticated;
grant execute on function public.family_points() to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- ============================================================
-- 7. Realtime for the remaining shared tables
-- ============================================================
alter publication supabase_realtime add table public.task_sessions;
alter publication supabase_realtime add table public.rewards;
alter publication supabase_realtime add table public.redemptions;
alter publication supabase_realtime add table public.profiles;
