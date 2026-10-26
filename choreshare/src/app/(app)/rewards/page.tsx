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

type Tab = "redeem" | "milestone";

export default function RewardsPage() {
  const { me, partner, family, nameOf } = useFamily();
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
  const rewardName = (id: string) => rewardOf(id)?.name ?? "（已删除的奖励）";

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
    if (error) return setError(error.message);
    setName("");
    setShowForm(false);
    load();
  }

  async function redeem(reward: Reward) {
    if (!confirm(`花 ${reward.cost_points} 分兑换「${reward.name}」？`)) return;
    setBusy(reward.id);
    setError(null);
    const { error } = await createClient().rpc("redeem_reward", { p_reward_id: reward.id });
    if (error) setError(error.message);
    setBusy(null);
    load();
  }

  async function archive(reward: Reward) {
    if (!confirm(`删除奖励「${reward.name}」？`)) return;
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">奖励</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus /> 新奖励
        </Button>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex items-center justify-between pt-4">
          <span>我的积分</span>
          <span className="text-3xl font-bold tabular-nums">{balance}</span>
        </CardContent>
      </Card>

      {owedByMe.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-orange-600">待我履行</h2>
          {owedByMe.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 text-sm">
              <span className="flex-1">
                {nameOf(r.user_id)} {r.period_key ? "解锁了" : "兑换了"}「{rewardName(r.reward_id)}」
              </span>
              <Button size="sm" variant="outline" onClick={() => fulfill(r)}>
                <Check /> 已履行
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 rounded-md bg-muted p-1">
        {(
          [
            ["redeem", "积分兑换"],
            ["milestone", "里程碑"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded py-1.5 text-sm font-medium transition-colors",
              tab === key ? "bg-background shadow-sm" : "text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={addReward} className="flex flex-col gap-2 rounded-lg border p-3">
          <Input
            placeholder={tab === "redeem" ? "如：对方做一顿饭" : "达成后的奖励，如：周末大餐"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {tab === "redeem" ? (
            <div className="flex items-center gap-2 text-sm">
              需要
              <Input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} className="w-24" required />
              积分
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
                    {m.label}
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
              <span className="shrink-0">{MILESTONE_TYPES.find((m) => m.type === mType)?.unit}</span>
            </div>
          )}
          <Button type="submit">添加{tab === "redeem" ? "兑换奖励" : "里程碑"}</Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {tab === "redeem" && (
        <div className="flex flex-col gap-2">
          {shop.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">还没有奖励，添加一个吧 🎁</p>}
          {shop.map((r) => {
            const affordable = balance >= (r.cost_points ?? 0);
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <Gift className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.cost_points} 分 · {nameOf(r.created_by)}添加
                  </p>
                </div>
                <Button size="sm" disabled={!affordable || busy === r.id} onClick={() => redeem(r)}>
                  兑换
                </Button>
                <Button size="icon" variant="ghost" onClick={() => archive(r)} aria-label="删除">
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
            <p className="py-6 text-center text-sm text-muted-foreground">还没有里程碑，设一个共同目标吧 🏆</p>
          )}
          {milestones.map((r) => {
            const cond = r.milestone_condition!;
            const unlocks = redemptions.filter((x) => x.reward_id === r.id);
            return (
              <div key={r.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-warning" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{describeMilestone(cond)}</p>
                  </div>
                  {unlocks.length > 0 && <span className="text-xs text-muted-foreground">已解锁 {unlocks.length} 次</span>}
                  <Button size="icon" variant="ghost" onClick={() => archive(r)} aria-label="删除">
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
                        <span className="text-muted-foreground">{progressLabel(cond, value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-primary")}
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
          <h2 className="text-sm font-semibold text-muted-foreground">兑换与解锁记录</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {redemptions.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                <span>
                  {r.period_key ? (
                    <>
                      🏆 {nameOf(r.user_id)} 解锁「{rewardName(r.reward_id)}」
                      {periodLabel(r.period_key) && (
                        <span className="text-muted-foreground"> · {periodLabel(r.period_key)}</span>
                      )}
                    </>
                  ) : (
                    <>
                      {nameOf(r.user_id)} 兑换「{rewardName(r.reward_id)}」 −{r.points_spent}
                    </>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.is_fulfilled ? "✅ 已履行" : "待履行"} · {new Date(r.created_at).toLocaleDateString("zh-CN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
