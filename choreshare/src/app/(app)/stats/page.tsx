"use client";

import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Task, TaskReview, TaskSession } from "@/types/database";
import { formatMinutes, todayISO } from "@/lib/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { usePoints } from "@/components/use-points";

type Range = "week" | "month" | "custom";

function localISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeDates(range: Range, custom: { from: string; to: string }) {
  const now = new Date();
  if (range === "week") {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: localISO(monday), to: localISO(sunday) };
  }
  if (range === "month") {
    return {
      from: localISO(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: localISO(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  return custom;
}

/** [from, to] inclusive local dates → ISO timestamps for querying */
function toBounds(from: string, to: string) {
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: new Date(`${from}T00:00:00`).toISOString(), end: end.toISOString() };
}

export default function StatsPage() {
  const { me, partner } = useFamily();
  const { points } = usePoints();
  const [range, setRange] = useState<Range>("week");
  const [custom, setCustom] = useState({ from: todayISO(-13), to: todayISO() });

  const { from, to } = rangeDates(range, custom);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();
    const { start, end } = toBounds(from, to);
    const [r, s, t] = await Promise.all([
      supabase.from("task_reviews").select("*").eq("status", "approved").gte("created_at", start).lt("created_at", end).returns<TaskReview[]>(),
      supabase.from("task_sessions").select("*").not("ended_at", "is", null).gte("ended_at", start).lt("ended_at", end).returns<TaskSession[]>(),
      supabase.from("tasks").select("id, status").gte("due_date", from).lte("due_date", to < todayISO() ? to : todayISO()),
    ]);
    return {
      reviews: r.data ?? [],
      sessions: s.data ?? [],
      dueTasks: (t.data as Pick<Task, "id" | "status">[]) ?? [],
    };
  }, [from, to]);
  const { data } = useLiveQuery(fetchStats, ["task_reviews", "task_sessions", "tasks"]);
  const reviews = useMemo(() => data?.reviews ?? [], [data]);
  const sessions = data?.sessions ?? [];
  const dueTasks = data?.dueTasks ?? [];

  const people = [
    { id: me.id, name: me.name || "我", color: "var(--series-me)" },
    ...(partner ? [{ id: partner.id, name: partner.name || "TA", color: "var(--series-partner)" }] : []),
  ];

  const sum = (fn: (id: string) => number) => Object.fromEntries(people.map((p) => [p.id, fn(p.id)]));
  const counts = sum((id) => reviews.filter((r) => r.earned_by === id).length);
  const minutes = sum((id) => sessions.filter((s) => s.user_id === id).reduce((a, s) => a + Number(s.actual_minutes ?? 0), 0));
  const earned = sum((id) => reviews.filter((r) => r.earned_by === id).reduce((a, r) => a + (r.points_awarded ?? 0), 0));
  const completionRate = dueTasks.length ? Math.round((dueTasks.filter((t) => t.status === "completed").length / dueTasks.length) * 100) : null;

  const daily = useMemo(() => {
    const rows: Record<string, string | number>[] = [];
    const d = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);
    while (d <= last && rows.length < 62) {
      const day = localISO(d);
      const row: Record<string, string | number> = { day: `${d.getMonth() + 1}/${d.getDate()}` };
      for (const p of people) {
        row[p.id] = reviews.filter((r) => r.earned_by === p.id && localISO(new Date(r.created_at)) === day).length;
      }
      rows.push(row);
      d.setDate(d.getDate() + 1);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, reviews, me.id, partner?.id]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">统计</h1>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["week", "本周"],
            ["month", "本月"],
            ["custom", "自定义"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              range === key ? "border-primary bg-primary text-primary-foreground" : "bg-background"
            )}
          >
            {label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex w-full items-center gap-2 text-sm">
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            至
            <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        )}
      </div>

      <Legend people={people} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">分工比例</CardTitle>
          <p className="text-xs text-muted-foreground">不比输赢，看看是否平衡</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ShareBar label="完成任务" people={people} values={counts} format={(v) => `${v} 件`} />
          <ShareBar label="贡献时长" people={people} values={minutes} format={(v) => formatMinutes(v)} />
          <ShareBar label="获得积分" people={people} values={earned} format={(v) => `${v} 分`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">每日完成任务数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} barGap={2} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" }}
                  formatter={(value, key) => [`${value} 件`, people.find((p) => p.id === key)?.name ?? ""]}
                />
                {people.map((p) => (
                  <Bar key={p.id} dataKey={p.id} fill={p.color} radius={[4, 4, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">任务完成率</p>
            <p className="text-3xl font-bold tabular-nums">{completionRate === null ? "—" : `${completionRate}%`}</p>
            <p className="text-xs text-muted-foreground">截至今天到期的 {dueTasks.length} 个任务</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">积分余额</p>
            {people.map((p) => (
              <p key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </span>
                <span className="font-semibold tabular-nums">{points[p.id]?.balance ?? 0}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type Person = { id: string; name: string; color: string };

function Legend({ people }: { people: Person[] }) {
  return (
    <div className="flex gap-4 text-sm">
      {people.map((p) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
          {p.name}
        </span>
      ))}
    </div>
  );
}

/** Two-segment bar showing each person's share of a total, with values labeled directly. */
function ShareBar({
  label,
  people,
  values,
  format,
}: {
  label: string;
  people: Person[];
  values: Record<string, number>;
  format: (v: number) => string;
}) {
  const total = people.reduce((a, p) => a + (values[p.id] ?? 0), 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {people.map((p) => format(values[p.id] ?? 0)).join(" : ")}
        </span>
      </div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          people.map((p) => {
            const pct = ((values[p.id] ?? 0) / total) * 100;
            return pct > 0 ? (
              <div
                key={p.id}
                title={`${p.name}：${format(values[p.id] ?? 0)}（${Math.round(pct)}%）`}
                className="h-full"
                style={{ width: `${pct}%`, background: p.color }}
              />
            ) : null;
          })}
      </div>
    </div>
  );
}
