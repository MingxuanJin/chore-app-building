-- ============================================================
-- ChoreShare: i18n (中文 / English / Italiano)
-- Run in Supabase Dashboard → SQL Editor
--
-- 1. Per-user interface language on the profile
-- 2. Functions raise error codes instead of Chinese text; the
--    frontend translates them (src/lib/i18n/errors.ts).
--    Format: "code" or "code:arg1:arg2"
-- ============================================================

alter table public.profiles
  add column if not exists locale text check (locale in ('zh', 'en', 'it'));

create or replace function public.create_family(family_name text default 'Our Home')
returns public.families
language plpgsql security definer set search_path = public as $$
declare
  fam public.families;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if (select family_id from profiles where id = auth.uid()) is not null then
    raise exception 'already_in_family';
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if (select family_id from profiles where id = auth.uid()) is not null then
    raise exception 'already_in_family';
  end if;

  select * into fam from families where pair_code = lower(trim(code));
  if fam.id is null then raise exception 'invalid_pair_code'; end if;

  select count(*) into member_count from profiles where family_id = fam.id;
  if member_count >= 2 then raise exception 'family_full'; end if;

  update profiles set family_id = fam.id where id = auth.uid();
  return fam;
end;
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
    raise exception 'reward_not_found';
  end if;
  if rw.reward_type <> 'redeem' or rw.cost_points is null then
    raise exception 'reward_not_redeemable';
  end if;

  -- serialize redemptions per user to avoid double spending
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select fp.balance into bal from public.family_points() fp where fp.user_id = auth.uid();
  if coalesce(bal, 0) < rw.cost_points then
    raise exception 'insufficient_points:%:%', coalesce(bal, 0), rw.cost_points;
  end if;

  insert into redemptions (reward_id, user_id, points_spent)
  values (rw.id, auth.uid(), rw.cost_points)
  returning * into red;
  return red;
end;
$$;

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

  -- Spawn the next instance for recurring tasks
  if p_approve and t.recurrence_type <> 'none' then
    perform set_config('choreshare.skip_notify', 'on', true);
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
    perform set_config('choreshare.skip_notify', 'off', true);
  end if;

  return rev;
end;
$$;
