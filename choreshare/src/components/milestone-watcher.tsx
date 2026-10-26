"use client";

import { useCallback, useEffect, useState } from "react";
import { PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery, useRealtime } from "@/lib/supabase/realtime";
import { browserTimeZone, describeMilestone } from "@/lib/milestones";
import type { Redemption, Reward } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useFamily } from "./family-provider";

type Unlock = Redemption & { rewards: Pick<Reward, "name" | "milestone_condition"> | null };

/**
 * Runs milestone detection whenever reviews change, and celebrates the
 * current user's new unlocks with a popup. Mounted once in the app layout.
 */
export function MilestoneWatcher() {
  const { me, partner } = useFamily();

  const check = useCallback(() => {
    // the query builder only sends the request once it's awaited / then'd
    createClient()
      .rpc("check_milestones", { p_tz: browserTimeZone() })
      .then(() => {});
  }, []);
  useEffect(check, [check]);
  useRealtime(["task_reviews", "rewards"], check);

  const fetchUnseen = useCallback(async () => {
    const { data } = await createClient()
      .from("redemptions")
      .select("*, rewards(name, milestone_condition)")
      .eq("user_id", me.id)
      .not("period_key", "is", null)
      .is("seen_at", null)
      .order("created_at")
      .returns<Unlock[]>();
    return data ?? [];
  }, [me.id]);
  const { data: unseen, reload } = useLiveQuery(fetchUnseen, ["redemptions"]);
  const [closing, setClosing] = useState(false);

  const current = unseen?.[0];
  if (!current) return null;

  async function dismiss() {
    setClosing(true);
    await createClient().from("redemptions").update({ seen_at: new Date().toISOString() }).eq("id", current!.id);
    await reload();
    setClosing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <PartyPopper className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">里程碑达成 · {describeMilestone(current.rewards?.milestone_condition ?? null)}</p>
        <h2 className="text-2xl font-bold">🎉 {current.rewards?.name}</h2>
        <p className="text-sm text-muted-foreground">已通知{partner?.name || "TA"}，等 TA 来兑现吧～</p>
        <Button className="mt-2 w-full" size="lg" disabled={closing} onClick={dismiss}>
          收下啦
        </Button>
      </div>
    </div>
  );
}
