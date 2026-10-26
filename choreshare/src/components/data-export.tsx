"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV, toCSV } from "@/lib/csv";
import { recurrenceLabel, todayISO } from "@/lib/tasks";
import type { Redemption, Reward, Task, TaskReview, TaskSession } from "@/types/database";
import { Button } from "@/components/ui/button";
import { useFamily } from "./family-provider";
import { useI18n } from "./i18n-provider";

type ReviewRow = TaskReview & { tasks: Pick<Task, "title"> | null };
type RedemptionRow = Redemption & { rewards: Pick<Reward, "name"> | null };

export function DataExport() {
  const { me, partner } = useFamily();
  const { t, dateLocale } = useI18n();
  const [busy, setBusy] = useState<"tasks" | "ledger" | null>(null);

  // Real names in exported files (not "You"), so the file makes sense to both
  const personName = (id: string | null) => {
    if (!id) return "";
    const p = [me, partner].find((x) => x?.id === id);
    return p ? p.name || p.email : "";
  };
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale) : "");
  const dateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(dateLocale, { dateStyle: "short", timeStyle: "short" }) : "";

  async function exportTasks() {
    setBusy("tasks");
    const supabase = createClient();
    const [tasks, sessions, reviews] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date", { ascending: false }).returns<Task[]>(),
      supabase.from("task_sessions").select("task_id, actual_minutes").returns<Pick<TaskSession, "task_id" | "actual_minutes">[]>(),
      supabase.from("task_reviews").select("*").eq("status", "approved").returns<TaskReview[]>(),
    ]);
    const minutesBy = new Map<string, number>();
    for (const s of sessions.data ?? []) {
      minutesBy.set(s.task_id, (minutesBy.get(s.task_id) ?? 0) + Number(s.actual_minutes ?? 0));
    }
    const approvalBy = new Map((reviews.data ?? []).map((r) => [r.task_id, r]));

    const csv = toCSV(
      [
        t("export.colTitle"),
        t("export.colDescription"),
        t("export.colStatus"),
        t("export.colDifficulty"),
        t("export.colAssignee"),
        t("export.colDueDate"),
        t("export.colRepeat"),
        t("export.colMinutes"),
        t("export.colPoints"),
        t("export.colCompletedAt"),
        t("export.colCreatedAt"),
      ],
      (tasks.data ?? []).map((task) => {
        const approval = approvalBy.get(task.id);
        const minutes = minutesBy.get(task.id);
        return [
          task.title,
          task.description,
          t(`status.${task.status}`),
          task.difficulty,
          personName(task.assigned_to),
          task.due_date ? date(`${task.due_date}T00:00:00`) : "",
          recurrenceLabel(t, task.recurrence_type, task.recurrence_value),
          minutes ? Math.round(minutes) : "",
          approval?.points_awarded ?? "",
          dateTime(approval?.created_at ?? null),
          dateTime(task.created_at),
        ];
      })
    );
    downloadCSV(`bunnychore-tasks-${todayISO()}.csv`, csv);
    setBusy(null);
  }

  async function exportLedger() {
    setBusy("ledger");
    const supabase = createClient();
    const [reviews, redemptions] = await Promise.all([
      supabase.from("task_reviews").select("*, tasks(title)").eq("status", "approved").returns<ReviewRow[]>(),
      supabase.from("redemptions").select("*, rewards(name)").returns<RedemptionRow[]>(),
    ]);
    const rows = [
      ...(reviews.data ?? []).map((r) => ({
        at: r.created_at,
        user: r.earned_by,
        type: t("export.typeTask"),
        item: r.tasks?.title ?? "",
        delta: r.points_awarded ?? 0,
      })),
      ...(redemptions.data ?? []).map((r) => ({
        at: r.created_at,
        user: r.user_id,
        type: r.period_key ? t("export.typeMilestone") : t("export.typeReward"),
        item: r.rewards?.name ?? t("rewards.deletedReward"),
        delta: -r.points_spent,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));

    const csv = toCSV(
      [t("export.colDate"), t("export.colPerson"), t("export.colType"), t("export.colItem"), t("export.colChange")],
      rows.map((r) => [dateTime(r.at), personName(r.user), r.type, r.item, r.delta])
    );
    downloadCSV(`bunnychore-points-${todayISO()}.csv`, csv);
    setBusy(null);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" disabled={busy !== null} onClick={exportTasks}>
        <Download /> {busy === "tasks" ? t("export.exporting") : t("export.tasks")}
      </Button>
      <Button variant="outline" disabled={busy !== null} onClick={exportLedger}>
        <Download /> {busy === "ledger" ? t("export.exporting") : t("export.ledger")}
      </Button>
    </div>
  );
}
