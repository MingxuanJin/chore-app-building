-- 009: one notification when a task is claimed and submitted at once
-- Logging time manually on an open task (008) claims it and sends it for review in a single update.
-- Before, the partner got two notifications (task_claimed + task_submitted); now only task_submitted.
-- Same function as 004 except the `new.status <> 'review'` check on the claim branch.

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
      -- picked up an open task → tell the partner, unless it is submitted in the same step
      -- (then the task_submitted notification below says it all)
      if new.status <> 'review' then
        perform public.notify(new.family_id, public.partner_of(auth.uid()), 'task_claimed', new.id, null, d);
      end if;
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
