"use client";

import { useCallback, useState } from "react";
import { Check, Gift, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Redemption, Reward } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFamily } from "@/components/family-provider";
import { usePoints } from "@/components/use-points";

export default function RewardsPage() {
  const { me, family, nameOf } = useFamily();
  const { points } = usePoints();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const [rw, rd] = await Promise.all([
      supabase.from("rewards").select("*").order("cost_points").returns<Reward[]>(),
      supabase.from("redemptions").select("*").order("created_at", { ascending: false }).limit(50).returns<Redemption[]>(),
    ]);
    return { rewards: rw.data ?? [], redemptions: rd.data ?? [] };
  }, []);
  const { data, reload: load } = useLiveQuery(fetchAll, ["rewards", "redemptions"]);
  const rewards = data?.rewards ?? [];
  const redemptions = data?.redemptions ?? [];

  const balance = points[me.id]?.balance ?? 0;
  const rewardName = (id: string) => rewards.find((r) => r.id === id)?.name ?? "（已删除的奖励）";

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await createClient()
      .from("rewards")
      .insert({ family_id: family.id, name: name.trim(), cost_points: Number(cost), reward_type: "redeem", created_by: me.id });
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
  const owedByMe = redemptions.filter((r) => !r.is_fulfilled && r.user_id !== me.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">奖励商店</h1>
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

      {showForm && (
        <form onSubmit={addReward} className="flex gap-2">
          <Input placeholder="如：对方做一顿饭" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="number" min={1} value={cost} onChange={(e) => setCost(e.target.value)} className="w-20" required aria-label="所需积分" />
          <Button type="submit">添加</Button>
        </form>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {owedByMe.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-orange-600">待我履行</h2>
          {owedByMe.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 text-sm">
              <span className="flex-1">
                {nameOf(r.user_id)} 兑换了「{rewardName(r.reward_id)}」
              </span>
              <Button size="sm" variant="outline" onClick={() => fulfill(r)}>
                <Check /> 已履行
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {shop.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">还没有奖励，添加一个吧 🎁</p>}
        {shop.map((r) => {
          const affordable = balance >= (r.cost_points ?? 0);
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Gift className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.cost_points} 分 · {nameOf(r.created_by)}添加</p>
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

      {redemptions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">兑换记录</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {redemptions.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                <span>
                  {nameOf(r.user_id)} 兑换「{rewardName(r.reward_id)}」 −{r.points_spent}
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
