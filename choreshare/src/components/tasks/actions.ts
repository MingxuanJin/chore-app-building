"use client";

import { createClient } from "@/lib/supabase/client";
import type { TaskSession } from "@/types/database";
import { sessionSeconds } from "@/lib/tasks";

// Client-side task state transitions. Points/review go through the
// review_task RPC so nobody can award themselves points.

export async function claimTask(taskId: string, userId: string) {
  const supabase = createClient();
  return supabase
    .from("tasks")
    .update({ assigned_to: userId, status: "claimed" })
    .eq("id", taskId)
    .eq("status", "pending");
}

export async function startTask(taskId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("task_sessions").insert({ task_id: taskId, user_id: userId });
  if (error) return { error };
  return supabase.from("tasks").update({ status: "in_progress", assigned_to: userId }).eq("id", taskId);
}

export async function pauseSession(session: TaskSession) {
  const supabase = createClient();
  return supabase.from("task_sessions").update({ paused_at: new Date().toISOString() }).eq("id", session.id);
}

export async function resumeSession(session: TaskSession) {
  if (!session.paused_at) return { error: null };
  const supabase = createClient();
  const pausedFor = Math.floor((Date.now() - new Date(session.paused_at).getTime()) / 1000);
  return supabase
    .from("task_sessions")
    .update({
      paused_at: null,
      paused_duration_seconds: session.paused_duration_seconds + Math.max(pausedFor, 0),
    })
    .eq("id", session.id);
}

/** Longest manual entry, in minutes (a whole day) */
export const MAX_MANUAL_MINUTES = 24 * 60;

/**
 * Log time typed in by hand and send the task for review. Stored as a finished session
 * ending now, so points, stats and export treat it like timed work.
 */
export async function logManualTime(taskId: string, userId: string, minutes: number) {
  const supabase = createClient();
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60_000);
  const { error } = await supabase.from("task_sessions").insert({
    task_id: taskId,
    user_id: userId,
    started_at: start.toISOString(),
    ended_at: end.toISOString(),
    actual_minutes: minutes,
    is_manual: true,
  });
  if (error) return { error };
  return supabase.from("tasks").update({ status: "review", assigned_to: userId }).eq("id", taskId);
}

/** End the running session (if any) and send the task to the partner for review. */
export async function submitTask(taskId: string, session: TaskSession | null) {
  const supabase = createClient();
  if (session) {
    // If paused, the pause time up to now doesn't count
    const resumed = session.paused_at
      ? {
          ...session,
          paused_at: null,
          paused_duration_seconds:
            session.paused_duration_seconds +
            Math.floor((Date.now() - new Date(session.paused_at).getTime()) / 1000),
        }
      : session;
    const now = new Date();
    const seconds = sessionSeconds({ ...resumed, ended_at: now.toISOString() });
    const { error } = await supabase
      .from("task_sessions")
      .update({
        ended_at: now.toISOString(),
        paused_at: null,
        paused_duration_seconds: resumed.paused_duration_seconds,
        actual_minutes: Math.round((seconds / 60) * 10) / 10,
      })
      .eq("id", session.id);
    if (error) return { error };
  }
  return supabase.from("tasks").update({ status: "review" }).eq("id", taskId);
}

export async function reviewTask(taskId: string, approve: boolean, comment?: string) {
  const supabase = createClient();
  return supabase.rpc("review_task", { p_task_id: taskId, p_approve: approve, p_comment: comment ?? null });
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  return supabase.from("tasks").delete().eq("id", taskId);
}
