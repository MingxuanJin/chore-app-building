-- ============================================================
-- ChoreShare: Initial Schema
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. Families (家庭空间)
-- ============================================================
create table public.families (
  id uuid default uuid_generate_v4() primary key,
  name text not null default 'Our Home',
  pair_code text not null unique default substr(md5(random()::text), 1, 6),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now() not null
);

-- ============================================================
-- 2. Profiles (用户资料，与 auth.users 1:1)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text,
  family_id uuid references public.families(id),
  created_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. Tasks (家务任务)
-- ============================================================
create type public.task_status as enum (
  'pending', 'claimed', 'in_progress', 'review', 'completed', 'rejected'
);

create type public.recurrence_type as enum (
  'none', 'daily', 'every_n_days', 'weekly', 'monthly', 'custom'
);

create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  estimated_minutes int,
  recurrence_type public.recurrence_type not null default 'none',
  recurrence_value jsonb, -- e.g. {"interval": 3} or {"days": [1,3,5]}
  assigned_to uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  status public.task_status not null default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================================
-- 4. Task Sessions (计时记录)
-- ============================================================
create table public.task_sessions (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  started_at timestamptz default now() not null,
  paused_at timestamptz,
  ended_at timestamptz,
  paused_duration_seconds int not null default 0,
  actual_minutes numeric(6,1)
);

-- ============================================================
-- 5. Task Reviews (完成确认)
-- ============================================================
create type public.review_status as enum ('approved', 'rejected');

create table public.task_reviews (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  status public.review_status not null,
  comment text,
  points_awarded int,
  created_at timestamptz default now() not null
);

-- ============================================================
-- 6. Rewards (奖励)
-- ============================================================
create type public.reward_type as enum ('redeem', 'milestone');

create table public.rewards (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  description text,
  cost_points int, -- null for milestone type
  reward_type public.reward_type not null default 'redeem',
  milestone_condition jsonb,
  created_by uuid not null references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz default now() not null
);

-- ============================================================
-- 7. Redemptions (兑换记录)
-- ============================================================
create table public.redemptions (
  id uuid default uuid_generate_v4() primary key,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  points_spent int not null,
  is_fulfilled boolean not null default false,
  created_at timestamptz default now() not null
);

-- ============================================================
-- 8. Shopping Items (购物清单)
-- ============================================================
create table public.shopping_items (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  added_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  is_purchased boolean not null default false,
  purchased_by uuid references auth.users(id),
  created_at timestamptz default now() not null
);

-- ============================================================
-- Row Level Security (RLS)
-- Users can only access data within their family
-- ============================================================

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_sessions enable row level security;
alter table public.task_reviews enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.shopping_items enable row level security;

-- Profiles: read own + family members, update own
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can read family members"
  on public.profiles for select using (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Families: members can read, creator can update
create policy "Family members can read"
  on public.families for select using (
    id in (select family_id from public.profiles where id = auth.uid())
  );

create policy "Anyone can create a family"
  on public.families for insert with check (auth.uid() = created_by);

-- Family-scoped tables: members can CRUD
-- Helper function
create or replace function public.user_family_id()
returns uuid as $$
  select family_id from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- Tasks
create policy "Family members can read tasks"
  on public.tasks for select using (family_id = public.user_family_id());

create policy "Family members can create tasks"
  on public.tasks for insert with check (family_id = public.user_family_id());

create policy "Family members can update tasks"
  on public.tasks for update using (family_id = public.user_family_id());

create policy "Family members can delete tasks"
  on public.tasks for delete using (family_id = public.user_family_id());

-- Task Sessions
create policy "Family members can manage sessions"
  on public.task_sessions for all using (
    task_id in (select id from public.tasks where family_id = public.user_family_id())
  );

-- Task Reviews
create policy "Family members can manage reviews"
  on public.task_reviews for all using (
    task_id in (select id from public.tasks where family_id = public.user_family_id())
  );

-- Rewards
create policy "Family members can read rewards"
  on public.rewards for select using (family_id = public.user_family_id());

create policy "Family members can create rewards"
  on public.rewards for insert with check (family_id = public.user_family_id());

create policy "Family members can update rewards"
  on public.rewards for update using (family_id = public.user_family_id());

-- Redemptions
create policy "Family members can manage redemptions"
  on public.redemptions for all using (
    reward_id in (select id from public.rewards where family_id = public.user_family_id())
  );

-- Shopping Items
create policy "Family members can manage shopping"
  on public.shopping_items for all using (family_id = public.user_family_id());

-- ============================================================
-- Enable Realtime for shared tables
-- ============================================================
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.task_reviews;
