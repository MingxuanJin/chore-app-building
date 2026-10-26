"use client";

import { useCallback, useState } from "react";
import { Check, Gift, Plus, Trash2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import { MILESTONE_TYPES, browserTimeZone, describeMilestone, periodLabel, progressLabel } from "@/lib/milestones";
import type { MilestoneProgress, MilestoneType, Redemption, Reward } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { usePoints } from "@/components/use-points";
import { useI18n } from "@/components/i18n-provider";
import { Art, EmptyNote, PageHeader, SectionTitle } from "@/components/fawn";
import { Segmented } from "@/components/ui/segmented";
import { translateError } from "@/lib/i18n/errors";

type Tab = "redeem" | "milestone";

export default function RewardsPage() {
  const { me, partner, family, nameOf } = useFamily();
  const { t, dateLocale } = useI18n();
  const { points } = usePoints();
  const [tab, setTab] = useState<Tab>("redeem");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("30");
  const [mType, setMType] = useState<MilestoneType>("streak_days");
  const [mTarget, setMTarget] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const [rw, rd, mp] = await Promise.all([
      supabase.from("rewards").select("*").order("cost_points").order("created_at").returns<Reward[]>(),
      supabase.from("redemptions").select("*").order("created_at", { ascending: false }).limit(50).returns<Redemption[]>(),
      supabase.rpc("milestone_progress", { p_tz: browserTimeZone() }),
    ]);
    return {
      rewards: rw.data ?? [],
      redemptions: rd.data ?? [],
      progress: ((mp.data ?? []) as MilestoneProgress[]).map((p) => ({
        ...p,
        progress: Number(p.progress),
        target: Number(p.target),
      })),
    };
  }, []);
  const { data, reload: load } = useLiveQuery(fetchAll, ["rewards", "redemptions", "task_reviews"]);
  const rewards = data?.rewards ?? [];
  const redemptions = data?.redemptions ?? [];
  const progress = data?.progress ?? [];

  const balance = points[me.id]?.balance ?? 0;
  const rewardOf = (id: string) => rewards.find((r) => r.id === id);
  const rewardName = (id: string) => rewardOf(id)?.name ?? t("rewards.deletedReward");

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const base = { family_id: family.id, name: name.trim(), created_by: me.id };
    const { error } = await createClient()
      .from("rewards")
      .insert(
        tab === "redeem"
          ? { ...base, reward_type: "redeem", cost_points: Number(cost) }
          : { ...base, reward_type: "milestone", milestone_condition: { type: mType, target: Number(mTarget) } }
      );
    if (error) return setError(translateError(t, error.message));
    setName("");
    setShowForm(false);
    load();
  }

  async function redeem(reward: Reward) {
    if (!confirm(t("rewards.confirmRedeem", { cost: reward.cost_points ?? 0, reward: reward.name }))) return;
    setBusy(reward.id);
    setError(null);
    const { error } = await createClient().rpc("redeem_reward", { p_reward_id: reward.id });
    if (error) setError(translateError(t, error.message));
    setBusy(null);
    load();
  }

  async function archive(reward: Reward) {
    if (!confirm(t("rewards.confirmDelete", { reward: reward.name }))) return;
    // soft delete keeps redemption history readable
    await createClient().from("rewards").update({ is_active: false }).eq("id", reward.id);
    load();
  }

  async function fulfill(r: Redemption) {
    await createClient().from("redemptions").update({ is_fulfilled: true }).eq("id", r.id);
    load();
  }

  const shop = rewards.filter((r) => r.is_active && r.reward_type === "redeem");
  const milestones = rewards.filter((r) => r.is_active && r.reward_type === "milestone");
  const owedByMe = redemptions.filter((r) => !r.is_fulfilled && r.user_id !== me.id);
  const people = [me, ...(partner ? [partner] : [])];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={t("deco.rewards")}
        title={t("rewards.title")}
        art="piano"
        action={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus /> {t("rewards.newReward")}
          </Button>
        }
      />

      <Card lace blush>
        <CardContent className="flex items-center justify-between gap-4 py-3">
          <span className="font-serif text-xl italic">{t("rewards.myPoints")}</span>
          <span className="relative flex h-28 w-28 shrink-0 items-center justify-center">
            <Art name="doily" className="absolute inset-0 w-28" />
            <span className="relative font-serif text-[34px] font-medium lining-nums tabular-nums">{balance}</span>
          </span>
        </CardContent>
      </Card>

      {owedByMe.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle className="text-attention">{t("rewards.owedByMe")}</SectionTitle>
          {owedByMe.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-xs bg-kraft p-3 shadow-sm">
              <span className="flex-1">
                {t(r.period_key ? "rewards.unlockedThing" : "rewards.redeemedThing", {
                  name: nameOf(r.user_id),
                  reward: rewardName(r.reward_id),
                })}
              </span>
              <Button size="sm" variant="outline" onClick={() => fulfill(r)}>
                <Check /> {t("rewards.markFulfilled")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "redeem", label: t("rewards.tabRedeem") },
          { value: "milestone", label: t("rewards.tabMilestone") },
        ]}
      />

      {showForm && (
        <form onSubmit={addReward} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <Input
            placeholder={t(tab === "redeem" ? "rewards.redeemPlaceholder" : "rewards.milestonePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {tab === "redeem" ? (
            <div className="flex items-center gap-2 text-sm">
              {t("rewards.needs")}
              <Input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} className="w-24" required />
              {t("rewards.pointsWord")}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <Select
                value={mType}
                onChange={(e) => {
                  const t = MILESTONE_TYPES.find((m) => m.type === e.target.value)!;
                  setMType(t.type);
                  setMTarget(String(t.defaultTarget));
                }}
              >
                {MILESTONE_TYPES.map((m) => (
                  <option key={m.type} value={m.type}>
                    {t(m.label)}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                max={mType === "monthly_completion" ? 100 : undefined}
                value={mTarget}
                onChange={(e) => setMTarget(e.target.value)}
                className="w-24"
                required
              />
              <span className="shrink-0">{t(MILESTONE_TYPES.find((m) => m.type === mType)!.unit)}</span>
            </div>
          )}
          <Button type="submit">{t(tab === "redeem" ? "rewards.addRedeem" : "rewards.addMilestone")}</Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === "redeem" && (
        <div className="flex flex-col gap-2">
          {shop.length === 0 && <EmptyNote art="asciiRabbit">{t("rewards.emptyShop")}</EmptyNote>}
          {shop.map((r) => {
            const affordable = balance >= (r.cost_points ?? 0);
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush">
                  <Gift className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("rewards.costLine", { cost: r.cost_points ?? 0, name: nameOf(r.created_by) })}
                  </p>
                </div>
                <Button size="sm" disabled={!affordable || busy === r.id} onClick={() => redeem(r)}>
                  {t("rewards.redeem")}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => archive(r)} aria-label={t("common.delete")}>
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "milestone" && (
        <div className="flex flex-col gap-2">
          {milestones.length === 0 && (
            <EmptyNote art="asciiFawn">{t("rewards.emptyMilestones")}</EmptyNote>
          )}
          {milestones.map((r) => {
            const cond = r.milestone_condition!;
            const unlocks = redemptions.filter((x) => x.reward_id === r.id);
            return (
              <div key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kraft">
                    <Trophy className="h-5 w-5 text-warning" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{describeMilestone(t, cond)}</p>
                  </div>
                  {unlocks.length > 0 && <span className="text-xs text-muted-foreground">{t("rewards.unlockedTimes", { n: unlocks.length })}</span>}
                  <Button size="icon" variant="ghost" onClick={() => archive(r)} aria-label={t("common.delete")}>
                    <Trash2 />
                  </Button>
                </div>
                {people.map((p) => {
                  const pr = progress.find((x) => x.reward_id === r.id && x.user_id === p.id);
                  const value = pr?.progress ?? 0;
                  const pct = Math.min(100, (value / cond.target) * 100);
                  return (
                    <div key={p.id} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span>{nameOf(p.id)}</span>
                        <span className="text-muted-foreground">{progressLabel(t, cond, value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-blush">
                        <div
                          className={cn("h-full rounded-full", pct >= 100 ? "bg-success/70" : "bg-rose/60")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {redemptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionTitle>{t("rewards.history")}</SectionTitle>
          <ul className="flex flex-col gap-1 text-sm">
            {redemptions.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 rounded-sm bg-muted px-3 py-2">
                <span>
                  {r.period_key ? (
                    <>
                      {t("rewards.historyUnlock", { name: nameOf(r.user_id), reward: rewardName(r.reward_id) })}
                      {periodLabel(t, dateLocale, r.period_key) && (
                        <span className="text-muted-foreground"> · {periodLabel(t, dateLocale, r.period_key)}</span>
                      )}
                    </>
                  ) : (
                    <>
                      {t("rewards.historyRedeem", { name: nameOf(r.user_id), reward: rewardName(r.reward_id), points: r.points_spent })}
                    </>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.is_fulfilled ? t("rewards.statusFulfilled") : t("rewards.statusPending")} ·{" "}
                  {new Date(r.created_at).toLocaleDateString(dateLocale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
