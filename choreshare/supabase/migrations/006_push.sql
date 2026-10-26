-- ============================================================
-- ChoreShare: Web Push (手机推送)
-- Run in Supabase Dashboard → SQL Editor
--
-- Flow: notifications insert → trigger → pg_net POST {app}/api/push
--       → the API route renders the text in the recipient's language
--         and sends it with web-push.
--
-- After running this file, store the app URL and the shared secret
-- (same value as PUSH_WEBHOOK_SECRET on Vercel) — NOT committed:
--   insert into public.app_config (key, value) values
--     ('push_url', 'https://your-app.vercel.app'),
--     ('push_secret', '<PUSH_WEBHOOK_SECRET>')
--   on conflict (key) do update set value = excluded.value;
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ============================================================
-- Browser push subscriptions (one per device)
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  locale text,
  created_at timestamptz default now() not null
);

alter table public.push_subscriptions enable row level security;

create policy "Users read own subscriptions"
  on public.push_subscriptions for select using (user_id = auth.uid());
create policy "Users add own subscriptions"
  on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "Users update own subscriptions"
  on public.push_subscriptions for update using (user_id = auth.uid());
create policy "Users delete own subscriptions"
  on public.push_subscriptions for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ============================================================
-- Private server config (no policies → invisible to clients)
-- ============================================================
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- ============================================================
-- Send a push for every new notification
-- ============================================================
create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text;
  v_secret text;
  v_subs jsonb;
  v_sub_locale text;
  v_locale text;
  v_subject_name text;
begin
  select value into v_url from app_config where key = 'push_url';
  select value into v_secret from app_config where key = 'push_secret';
  if v_url is null or v_secret is null then return new; end if;

  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)),
         max(s.locale)
    into v_subs, v_sub_locale
  from push_subscriptions s
  where s.user_id = new.recipient_id;
  if v_subs is null then return new; end if;

  select coalesce(p.locale, v_sub_locale, 'en') into v_locale from profiles p where p.id = new.recipient_id;
  select nullif(p.name, '') into v_subject_name
  from profiles p where p.id = coalesce((new.data->>'user')::uuid, new.actor_id);

  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/push',
    body := jsonb_build_object(
      'notification', to_jsonb(new),
      'locale', v_locale,
      'subject_name', v_subject_name,
      'subscriptions', v_subs
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret)
  );
  return new;
exception when others then
  -- a push failure must never block the in-app notification
  return new;
end;
$$;

drop trigger if exists push_on_notification on public.notifications;
create trigger push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

-- ============================================================
-- Called by /api/push to drop subscriptions the push service
-- reports as gone (404/410). Guarded by the shared secret.
-- ============================================================
create or replace function public.delete_push_subscriptions(p_secret text, p_endpoints text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select value from app_config where key = 'push_secret') then
    raise exception 'forbidden';
  end if;
  delete from push_subscriptions where endpoint = any(p_endpoints);
end;
$$;

grant execute on function public.delete_push_subscriptions(text, text[]) to anon, authenticated;
