"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Task } from "@/types/database";

/** All non-completed tasks + the most recent completed ones, kept in sync. */
export function useTasks(completedLimit = 30) {
  const fetchTasks = useCallback(async () => {
    const supabase = createClient();
    const [active, done] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .neq("status", "completed")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .returns<Task[]>(),
      supabase
        .from("tasks")
        .select("*")
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(completedLimit)
        .returns<Task[]>(),
    ]);
    return [...(active.data ?? []), ...(done.data ?? [])];
  }, [completedLimit]);

  const { data, loading, reload } = useLiveQuery(fetchTasks, ["tasks"]);
  return { tasks: data ?? [], loading, reload };
}
