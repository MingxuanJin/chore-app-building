"use client";

import Link from "next/link";
import { CalendarDays, Repeat, User } from "lucide-react";
import type { Task } from "@/types/database";
import { STATUS_STYLE, dueLabel, recurrenceLabel, todayISO } from "@/lib/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { useI18n } from "@/components/i18n-provider";
import { DifficultyStars } from "./difficulty";
import { claimTask } from "./actions";

export function TaskCard({ task }: { task: Task }) {
  const { me, nameOf } = useFamily();
  const { t, dateLocale } = useI18n();
  const due = dueLabel(t, dateLocale, task.due_date);
  const overdue = task.status !== "completed" && task.due_date && task.due_date < todayISO();
  const needsMyReview = task.status === "review" && task.assigned_to !== me.id;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/60",
        needsMyReview && "border-rose/40 bg-muted"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-[18px] font-medium", task.status === "completed" && "text-muted-foreground line-through")}>
            {task.title}
          </span>
          <Badge className={STATUS_STYLE[task.status]}>{t(`status.${task.status}`)}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <DifficultyStars value={task.difficulty} />
          {task.assigned_to && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {nameOf(task.assigned_to)}
            </span>
          )}
          {due && (
            <span className={cn("inline-flex items-center gap-1", overdue && "text-destructive")}>
              <CalendarDays className="h-3 w-3" />
              {due}
            </span>
          )}
          {task.recurrence_type !== "none" && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {recurrenceLabel(t, task.recurrence_type, task.recurrence_value)}
            </span>
          )}
        </div>
      </div>
      {task.status === "pending" && (
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            claimTask(task.id, me.id);
          }}
        >
          {t("tasks.claim")}
        </Button>
      )}
      {needsMyReview && <span className="shrink-0 text-sm italic text-attention">{t("tasks.goReview")}</span>}
    </Link>
  );
}
