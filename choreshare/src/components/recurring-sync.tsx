"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { browserTimeZone } from "@/lib/milestones";

/**
 * Creates today's instances of recurring tasks when the app opens or comes
 * back to the foreground (an hourly DB cron job covers the rest).
 */
export function RecurringSync() {
  useEffect(() => {
    const sync = () => {
      createClient()
        .rpc("sync_recurring_tasks", { p_tz: browserTimeZone() })
        .then(() => {});
    };
    sync();
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
