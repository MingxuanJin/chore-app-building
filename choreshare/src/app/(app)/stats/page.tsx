"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Redemption, Reward, Task, TaskReview, TaskSession } from "@/types/database";
import { formatMinutes, todayISO } from "@/lib/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { usePoints } from "@/components/use-points";
import { useI18n } from "@/components/i18n-provider";
import { PageHeader } from "@/components/fawn";
import { GroupedBars, Meter, TrendLines, type Series } from "@/components/stats/charts";
import { Button } from "@/components/ui/button";

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

type ReviewRow = TaskReview & { tasks: Pick<Task, "title" | "difficulty"> | null };
type RedemptionRow = Redemption & { rewards: Pick<Reward, "name"> | null };

const LEDGER_PAGE = 10;

export default function StatsPage() {
  const { me, partner, nameOf } = useFamily();
  const { t, dateLocale } = useI18n();
  const { points } = usePoints();
  const [range, setRange] = useState<Range>("week");
  const [custom, setCustom] = useState({ from: todayISO(-13), to: todayISO() });
  const [ledgerShown, setLedgerShown] = useState(LEDGER_PAGE);

  const { from, to } = rangeDates(range, custom);

  const fetchStats = useCallback(async () => {
    const supabase = createClient();
    const { start, end } = toBounds(from, to);
    const [r, s, tk, rd] = await Promise.all([
      supabase
        .from("task_reviews")
        .select("*, tasks(title, difficulty)")
        .eq("status", "approved")
        .gte("created_at", start)
        .lt("created_at", end)
        .returns<ReviewRow[]>(),
      supabase
        .from("task_sessions")
        .select("*")
        .not("ended_at", "is", null)
        .gte("ended_at", start)
        .lt("ended_at", end)
        .returns<TaskSession[]>(),
      supabase
        .from("tasks")
        .select("id, status")
        .gte("due_date", from)
        .lte("due_date", to < todayISO() ? to : todayISO()),
      supabase
        .from("redemptions")
        .select("*, rewards(name)")
        .gt("points_spent", 0)
        .gte("created_at", start)
        .lt("created_at", end)
        .returns<RedemptionRow[]>(),
    ]);
    return {
      reviews: r.data ?? [],
      sessions: s.data ?? [],
      dueTasks: (tk.data as Pick<Task, "id" | "status">[]) ?? [],
      redemptions: rd.data ?? [],
    };
  }, [from, to]);
  const { data } = useLiveQuery(fetchStats, ["task_reviews", "task_sessions", "tasks", "redemptions"]);

  const people: Series[] = useMemo(
    () => [
      { id: me.id, name: me.name || t("common.you"), color: "var(--series-me)" },
      ...(partner ? [{ id: partner.id, name: partner.name || t("common.partner"), color: "var(--series-partner)" }] : []),
    ],
    [me, partner, t]
  );

  const stats = useMemo(() => {
    const reviews = data?.reviews ?? [];
    const sessions = data?.sessions ?? [];
    const dueTasks = data?.dueTasks ?? [];
    const redemptions = data?.redemptions ?? [];
    const per = (fn: (id: string) => number) => Object.fromEntries(people.map((p) => [p.id, fn(p.id)]));
    const sessionMinutes = (x: TaskSession) => Number(x.actual_minutes ?? 0);

    // One row per day in the range (capped so a huge custom range stays readable)
    const daily: Record<string, string | number>[] = [];
    const trend: Record<string, string | number>[] = [];
    const d = new Date(`${from}T00:00:00`);
    const last = new Date(`${to}T00:00:00`);
    while (d <= last && daily.length < 92) {
      const day = localISO(d);
      const label = d.toLocaleDateString(dateLocale, { month: "numeric", day: "numeric" });
      const countRow: Record<string, string | number> = { day: label };
      const timeRow: Record<string, string | number> = { day: label };
      for (const p of people) {
        countRow[p.id] = reviews.filter((r) => r.earned_by === p.id && localISO(new Date(r.created_at)) === day).length;
        timeRow[p.id] = Math.round(
          sessions
            .filter((x) => x.user_id === p.id && localISO(new Date(x.ended_at!)) === day)
            .reduce((a, x) => a + sessionMinutes(x), 0)
        );
      }
      daily.push(countRow);
      trend.push(timeRow);
      d.setDate(d.getDate() + 1);
    }

    const byDifficulty = [1, 2, 3, 4, 5].map((level) => {
      const row: Record<string, string | number> = { level: t("stats.stars", { n: level }) };
      for (const p of people) {
        row[p.id] = reviews.filter((r) => r.earned_by === p.id && r.tasks?.difficulty === level).length;
      }
      return row;
    });

    const ledger = [
      ...reviews.map((r) => ({
        id: r.id,
        at: r.created_at,
        user: r.earned_by,
        reason: r.tasks?.title ?? "—",
        delta: r.points_awarded ?? 0,
      })),
      ...redemptions.map((r) => ({
        id: r.id,
        at: r.created_at,
        user: r.user_id,
        reason: r.rewards?.name ?? t("rewards.deletedReward"),
        delta: -r.points_spent,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    const done = dueTasks.filter((x) => x.status === "completed").length;

    return {
      counts: per((id) => reviews.filter((r) => r.earned_by === id).length),
      minutes: per((id) => sessions.filter((x) => x.user_id === id).reduce((a, x) => a + sessionMinutes(x), 0)),
      earned: per((id) => reviews.filter((r) => r.earned_by === id).reduce((a, r) => a + (r.points_awarded ?? 0), 0)),
      completion: {
        done,
        total: dueTasks.length,
        rate: dueTasks.length ? Math.round((done / dueTasks.length) * 100) : null,
      },
      daily,
      trend,
      byDifficulty,
      ledger,
    };
  }, [data, people, from, to, dateLocale, t]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow={t("deco.stats")} title={t("stats.title")} art="asciiLily" />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["week", "stats.week"],
            ["month", "stats.month"],
            ["custom", "stats.custom"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={cn(
              "rounded-full border px-4 py-1 text-sm transition-colors",
              range === key ? "border-transparent bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"
            )}
          >
            {t(label)}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex w-full items-center gap-2 text-sm">
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            {t("stats.to")}
            <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        )}
      </div>

      <Legend people={people} />

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.share")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("stats.shareHint")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ShareBar label={t("stats.tasksDone")} people={people} values={stats.counts} format={(v) => t("stats.tasksUnit", { n: v })} />
          <ShareBar label={t("stats.timeSpent")} people={people} values={stats.minutes} format={(v) => formatMinutes(t, v)} />
          <ShareBar label={t("stats.pointsEarned")} people={people} values={stats.earned} format={(v) => t("common.points", { n: v })} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-2 pt-4">
            <p className="text-xs text-muted-foreground">{t("stats.completionRate")}</p>
            <Meter
              value={stats.completion.rate}
              label={t("stats.completionDetail", { done: stats.completion.done, total: stats.completion.total })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{t("stats.balance")}</p>
            {people.map((p) => (
              <p key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </span>
                <span className="font-semibold lining-nums tabular-nums">{points[p.id]?.balance ?? 0}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.dailyChart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupedBars data={stats.daily} xKey="day" series={people} format={(v) => t("stats.tasksUnit", { n: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.timeTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendLines data={stats.trend} xKey="day" series={people} format={(v) => formatMinutes(t, v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.difficultyChart")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("stats.difficultyHint")}</p>
        </CardHeader>
        <CardContent>
          <GroupedBars data={stats.byDifficulty} xKey="level" series={people} format={(v) => t("stats.tasksUnit", { n: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stats.ledger")}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.ledger.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("stats.ledgerEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {stats.ledger.slice(0, ledgerShown).map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: people.find((p) => p.id === e.user)?.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{e.reason}</span>
                    <span className="text-xs text-muted-foreground">
                      {nameOf(e.user)} · {new Date(e.at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                    </span>
                  </span>
                  <span className="font-semibold lining-nums tabular-nums">{e.delta > 0 ? `+${e.delta}` : `−${-e.delta}`}</span>
                </li>
              ))}
            </ul>
          )}
          {stats.ledger.length > ledgerShown && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setLedgerShown((n) => n + LEDGER_PAGE)}>
              {t("stats.showMore")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type Person = Series;

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
                title={`${p.name}: ${format(values[p.id] ?? 0)} (${Math.round(pct)}%)`}
                className="h-full"
                style={{ width: `${pct}%`, background: p.color }}
              />
            ) : null;
          })}
      </div>
    </div>
  );
}
