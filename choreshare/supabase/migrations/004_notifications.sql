-- ============================================================
-- ChoreShare: In-app notifications (站内通知)
-- Run in Supabase Dashboard → SQL Editor
--
-- Notifications are created by triggers, so they're generated no matter
-- which client made the change. They're stored as structured data
-- (type + data) and rendered by the frontend in the reader's language.
--
-- Types:
--   task_assigned     某人把任务分配给你            data: {title}
--   task_claimed      对方认领了待认领任务          data: {title}
--   task_submitted    对方提交了任务，等你确认       data: {title}
--   task_approved     你的任务被确认               data: {title, points}
--   task_rejected     你的任务被驳回               data: {title, comment}
--   reward_redeemed   对方兑换了奖励，等你履行       data: {name, points, user}
--   milestone_unlocked 对方解锁了里程碑，等你履行     data: {name, points, user}
--   reward_fulfilled  对方履行了你的奖励            data: {name}
--   shopping_assigned 购物项被指派给你去买          data: {name}
-- ============================================================

create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  task_id uuid references public.tasks(id) on delete set null,
  reward_id uuid references public.rewards(id) on delete set null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select using (recipient_id = auth.uid());
create policy "Users mark own notifications read"
  on public.notifications for update using (recipient_id = auth.uid());
create policy "Users delete own notifications"
  on public.notifications for delete using (recipient_id = auth.uid());
-- no insert policy: only the security definer triggers below create rows

grant select, update, delete on public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- Helpers
-- ============================================================
-- The other member of a user's family
create or replace function public.partner_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where p.family_id = (select family_id from profiles where id = p_user)
    and p.id <> p_user
  limit 1
$$;

create or replace function public.notify(
  p_family uuid, p_recipient uuid, p_type text,
  p_task uuid default null, p_reward uuid default null, p_data jsonb default '{}',
  p_force boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null then return; end if;
  -- never notify people about their own actions (unless forced)
  if p_recipient = auth.uid() and not p_force then return; end if;
  if current_setting('choreshare.skip_notify', true) = 'on' then return; end if;
  insert into notifications (family_id, recipient_id, actor_id, type, task_id, reward_id, data)
  values (p_family, p_recipient, auth.uid(), p_type, p_task, p_reward, coalesce(p_data, '{}'));
end;
$$;

revoke execute on function public.notify(uuid, uuid, text, uuid, uuid, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.partner_of(uuid) from public, anon, authenticated;

-- ============================================================
-- Tasks: assigned / claimed / submitted
-- ============================================================
create or replace function public.tasks_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  d jsonb := jsonb_build_object('title', new.title);
begin
  if tg_op = 'INSERT' then
    if new.assigned_to is not null then
      perform public.notify(new.family_id, new.assigned_to, 'task_assigned', new.id, null, d);
    end if;
    return new;
  end if;

  -- (re)assigned to someone else
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    if old.status = 'pending' and new.assigned_to = auth.uid() then
      -- picked up an open task → tell the partner
      perform public.notify(new.family_id, public.partner_of(auth.uid()), 'task_claimed', new.id, null, d);
    else
      perform public.notify(new.family_id, new.assigned_to, 'task_assigned', new.id, null, d);
    end if;
  end if;

  -- submitted for review → the partner of the doer must confirm
  if new.status = 'review' and old.status <> 'review' then
    perform public.notify(new.family_id, public.partner_of(coalesce(new.assigned_to, auth.uid())),
                          'task_submitted', new.id, null, d);
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_notify on public.tasks;
create trigger tasks_notify
  after insert or update on public.tasks
  for each row execute function public.tasks_notify();

-- ============================================================
-- Reviews: approved / rejected
-- ============================================================
create or replace function public.task_reviews_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from tasks where id = new.task_id;
  if new.status = 'approved' then
    perform public.notify(t.family_id, coalesce(new.earned_by, t.assigned_to), 'task_approved', t.id, null,
                          jsonb_build_object('title', t.title, 'points', new.points_awarded));
  else
    perform public.notify(t.family_id, t.assigned_to, 'task_rejected', t.id, null,
                          jsonb_build_object('title', t.title, 'comment', new.comment));
  end if;
  return new;
end;
$$;

drop trigger if exists task_reviews_notify on public.task_reviews;
create trigger task_reviews_notify
  after insert on public.task_reviews
  for each row execute function public.task_reviews_notify();

-- ============================================================
-- Redemptions: redeemed / milestone unlocked / fulfilled
-- ============================================================
create or replace function public.redemptions_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rw public.rewards;
begin
  select * into rw from rewards where id = new.reward_id;

  if tg_op = 'INSERT' then
    -- milestone unlocks are detected by whichever client checks first, so the
    -- partner may be the one "acting" here; they still need to know
    perform public.notify(
      rw.family_id, public.partner_of(new.user_id),
      case when new.period_key is not null then 'milestone_unlocked' else 'reward_redeemed' end,
      null, rw.id, jsonb_build_object('name', rw.name, 'points', new.points_spent, 'user', new.user_id),
      new.period_key is not null
    );
  elsif new.is_fulfilled and not old.is_fulfilled then
    perform public.notify(rw.family_id, new.user_id, 'reward_fulfilled', null, rw.id,
                          jsonb_build_object('name', rw.name));
  end if;
  return new;
end;
$$;

drop trigger if exists redemptions_notify on public.redemptions;
create trigger redemptions_notify
  after insert or update on public.redemptions
  for each row execute function public.redemptions_notify();

-- ============================================================
-- Shopping: assigned to buy
-- ============================================================
create or replace function public.shopping_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.family_id, new.assigned_to, 'shopping_assigned', null, null,
                          jsonb_build_object('name', new.name));
  end if;
  return new;
end;
$$;

drop trigger if exists shopping_notify on public.shopping_items;
create trigger shopping_notify
  after insert or update on public.shopping_items
  for each row execute function public.shopping_notify();

-- ============================================================
-- review_task: same as 002, but the spawned recurring instance doesn't
-- send a "task_assigned" notification (the approval already notifies)
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
