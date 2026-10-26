"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock, Pause, Pencil, Play, Repeat, Send, Trash2, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Task, TaskReview, TaskSession } from "@/types/database";
import {
  STATUS_STYLE,
  calcPoints,
  dueLabel,
  formatMinutes,
  recurrenceLabel,
  sessionSeconds,
} from "@/lib/tasks";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useFamily } from "@/components/family-provider";
import { useI18n } from "@/components/i18n-provider";
import { translateError } from "@/lib/i18n/errors";
import { DifficultyStars } from "@/components/tasks/difficulty";
import { TimerDisplay } from "@/components/tasks/timer";
import {
  claimTask,
  deleteTask,
  pauseSession,
  resumeSession,
  reviewTask,
  startTask,
  submitTask,
} from "@/components/tasks/actions";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { me, partner, nameOf } = useFamily();
  const { t, dateLocale } = useI18n();
  const partnerName = partner?.name || t("common.partner");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchTask = useCallback(async () => {
    const supabase = createClient();
    const [t, s, r] = await Promise.all([
      supabase.from("tasks").select("*").eq("id", id).maybeSingle<Task>(),
      supabase.from("task_sessions").select("*").eq("task_id", id).order("started_at").returns<TaskSession[]>(),
      supabase.from("task_reviews").select("*").eq("task_id", id).order("created_at", { ascending: false }).returns<TaskReview[]>(),
    ]);
    return { task: t.data, sessions: s.data ?? [], reviews: r.data ?? [] };
  }, [id]);
  const { data, loading, reload: load } = useLiveQuery(fetchTask, ["tasks", "task_sessions", "task_reviews"]);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    if (error) setError(translateError(t, error.message));
    await load();
    setBusy(false);
  }

  if (loading || !data) return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>;
  const { task, sessions, reviews } = data;
  if (!task) return <p className="py-8 text-center text-sm text-muted-foreground">{t("taskDetail.notFound")}</p>;

  const isMine = task.assigned_to === me.id;
  const active = sessions.find((s) => !s.ended_at) ?? null;
  const totalMinutes = sessions.reduce((sum, s) => sum + sessionSeconds(s), 0) / 60;
  const latestReview = reviews[0];
  const due = dueLabel(t, dateLocale, task.due_date);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className={STATUS_STYLE[task.status]}>{t(`status.${task.status}`)}</Badge>
            <DifficultyStars value={task.difficulty} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {task.status !== "completed" && (
            <Link href={`/tasks/${task.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={t("common.edit")}>
              <Pencil />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.delete")}
            onClick={async () => {
              if (!confirm(t("taskDetail.confirmDelete"))) return;
              await deleteTask(task.id);
              router.replace("/tasks");
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {task.description && <p className="whitespace-pre-wrap text-sm">{task.description}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info icon={User} label={t("taskDetail.assignee")} value={nameOf(task.assigned_to)} />
        {due && <Info icon={CalendarDays} label={t("taskDetail.date")} value={due} />}
        {task.estimated_minutes && <Info icon={Clock} label={t("taskDetail.estimate")} value={formatMinutes(t, task.estimated_minutes)} />}
        {task.recurrence_type !== "none" && (
          <Info icon={Repeat} label={t("taskDetail.repeat")} value={recurrenceLabel(t, task.recurrence_type, task.recurrence_value)} />
        )}
      </div>

      {/* Rejection feedback */}
      {task.status === "rejected" && latestReview?.status === "rejected" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 text-sm">
            <p className="font-medium text-destructive">{t("taskDetail.rejectedBy", { name: nameOf(latestReview.reviewer_id) })}</p>
            {latestReview.comment && <p className="mt-1">“{latestReview.comment}”</p>}
          </CardContent>
        </Card>
      )}

      {/* Timer + actions */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <TimerDisplay sessions={sessions} />
          {task.status === "in_progress" && active?.paused_at && <p className="text-sm text-muted-foreground">{t("taskDetail.paused")}</p>}

          <div className="flex w-full flex-col gap-2">
            {task.status === "pending" && (
              <>
                <Button size="lg" disabled={busy} onClick={() => run(() => claimTask(task.id, me.id))}>
                  {t("tasks.claim")}
                </Button>
                <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => startTask(task.id, me.id))}>
                  <Play /> {t("taskDetail.claimAndStart")}
                </Button>
              </>
            )}

            {(task.status === "claimed" || task.status === "rejected") &&
              (isMine ? (
                <Button size="lg" disabled={busy} onClick={() => run(() => startTask(task.id, me.id))}>
                  <Play /> {task.status === "rejected" ? t("taskDetail.restart") : t("taskDetail.start")}
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">{t("taskDetail.waitingStart", { name: nameOf(task.assigned_to) })}</p>
              ))}

            {task.status === "in_progress" &&
              (isMine ? (
                <>
                  {active &&
                    (active.paused_at ? (
                      <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => resumeSession(active))}>
                        <Play /> {t("taskDetail.resume")}
                      </Button>
                    ) : (
                      <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => pauseSession(active))}>
                        <Pause /> {t("taskDetail.pause")}
                      </Button>
                    ))}
                  <Button size="lg" disabled={busy} onClick={() => run(() => submitTask(task.id, active))}>
                    <Send /> {t("taskDetail.submit", { name: partnerName })}
                  </Button>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">{t("taskDetail.doing", { name: nameOf(task.assigned_to) })}</p>
              ))}

            {task.status === "review" &&
              (isMine ? (
                <p className="text-center text-sm text-muted-foreground">
                  {t("taskDetail.submittedWaiting", { name: partnerName, points: calcPoints(task.difficulty, totalMinutes) })}
                </p>
              ) : rejecting ? (
                <div className="flex flex-col gap-2">
                  <Textarea placeholder={t("taskDetail.rejectPlaceholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setRejecting(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const res = await reviewTask(task.id, false, comment);
                          if (!res.error) {
                            setRejecting(false);
                            setComment("");
                          }
                          return res;
                        })
                      }
                    >
                      {t("taskDetail.confirmReject")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    {t("taskDetail.reviewSummary", {
                      name: nameOf(task.assigned_to),
                      duration: formatMinutes(t, totalMinutes),
                      points: calcPoints(task.difficulty, totalMinutes),
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline" onClick={() => setRejecting(true)}>
                      <X /> {t("taskDetail.reject")}
                    </Button>
                    <Button size="lg" variant="success" disabled={busy} onClick={() => run(() => reviewTask(task.id, true))}>
                      <Check /> {t("taskDetail.approve")}
                    </Button>
                  </div>
                </>
              ))}

            {task.status === "completed" && latestReview?.status === "approved" && (
              <p className="text-center text-sm">
                {t("taskDetail.completedBy", {
                  reviewer: nameOf(latestReview.reviewer_id),
                  earner: nameOf(latestReview.earned_by),
                  points: latestReview.points_awarded ?? 0,
                })}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* History */}
      {(sessions.length > 0 || reviews.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("taskDetail.history")}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {[
              ...sessions.map((s) => ({
                at: s.started_at,
                text: s.ended_at
                  ? t("taskDetail.logTimed", { name: nameOf(s.user_id), duration: formatMinutes(t, sessionSeconds(s) / 60) })
                  : t("taskDetail.logStarted", { name: nameOf(s.user_id) }),
              })),
              ...reviews.map((r) => ({
                at: r.created_at,
                text:
                  r.status === "approved"
                    ? t("taskDetail.logApproved", { name: nameOf(r.reviewer_id), points: r.points_awarded ?? 0 })
                    : r.comment
                      ? t("taskDetail.logRejectedComment", { name: nameOf(r.reviewer_id), comment: r.comment })
                      : t("taskDetail.logRejected", { name: nameOf(r.reviewer_id) }),
              })),
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((e, i) => (
                <li key={i} className="flex justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <span>{e.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString(dateLocale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}
