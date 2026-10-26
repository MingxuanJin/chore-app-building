"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { UserPoints } from "@/types/database";

export function usePoints() {
  const fetchPoints = useCallback(async () => {
    const { data } = await createClient().rpc("family_points");
    const map: Record<string, UserPoints> = {};
    for (const row of (data ?? []) as UserPoints[]) {
      map[row.user_id] = {
        user_id: row.user_id,
        total_earned: Number(row.total_earned),
        total_spent: Number(row.total_spent),
        balance: Number(row.balance),
      };
    }
    return map;
  }, []);

  const { data, reload } = useLiveQuery(fetchPoints, ["task_reviews", "redemptions"]);
  return { points: data ?? {}, reload };
}
