"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery, useRealtime } from "@/lib/supabase/realtime";
import { browserTimeZone, describeMilestone } from "@/lib/milestones";
import type { Redemption, Reward } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useFamily } from "./family-provider";
import { useI18n } from "./i18n-provider";
import { Art } from "./fawn";

type Unlock = Redemption & { rewards: Pick<Reward, "name" | "milestone_condition"> | null };

/**
 * Runs milestone detection whenever reviews change, and celebrates the
 * current user's new unlocks with a popup. Mounted once in the app layout.
 */
export function MilestoneWatcher() {
  const { me, partner } = useFamily();
  const { t } = useI18n();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-6" role="dialog" aria-modal="true">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card p-6 pt-4 text-center shadow-xl">
        <Art name="swag" className="absolute inset-x-0 top-0 w-full" />
        <span className="relative mt-6 flex h-36 w-36 items-center justify-center">
          <Art name="doily" className="absolute inset-0 w-36" />
          <Art name="bow" className="relative w-20" />
        </span>
        <p className="font-script text-[36px] leading-10 text-rose">{t("deco.milestone")}</p>
        <p className="text-sm text-muted-foreground">
          {t("milestones.popupReached", { condition: describeMilestone(t, current.rewards?.milestone_condition ?? null) })}
        </p>
        <h2 className="font-serif text-[26px] font-medium leading-8">{current.rewards?.name}</h2>
        <p className="text-sm text-muted-foreground">{t("milestones.popupNotified", { name: partner?.name || t("common.partner") })}</p>
        <Button className="mt-2 w-full" size="lg" disabled={closing} onClick={dismiss}>
          {t("milestones.popupAccept")}
        </Button>
      </div>
    </div>
  );
}
