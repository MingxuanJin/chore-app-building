-- 008: manually entered task time
-- A manual entry is stored as an already-finished session (started_at = now - minutes, ended_at = now,
-- actual_minutes = minutes), so review_task, stats and CSV export count it like timed work.
-- is_manual only lets the partner see in the history that the time was typed in, not timed.

alter table public.task_sessions
  add column if not exists is_manual boolean not null default false;
