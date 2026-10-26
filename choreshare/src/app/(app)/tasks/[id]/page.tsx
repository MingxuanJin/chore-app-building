"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock, Pause, Pencil, Play, Repeat, Send, Trash2, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import type { Task, TaskReview, TaskSession } from "@/types/database";
import {
  STATUS_LABEL,
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
    if (error) setError(error.message);
    await load();
    setBusy(false);
  }

  if (loading || !data) return <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>;
  const { task, sessions, reviews } = data;
  if (!task) return <p className="py-8 text-center text-sm text-muted-foreground">任务不存在或已删除</p>;

  const isMine = task.assigned_to === me.id;
  const active = sessions.find((s) => !s.ended_at) ?? null;
  const totalMinutes = sessions.reduce((sum, s) => sum + sessionSeconds(s), 0) / 60;
  const latestReview = reviews[0];
  const due = dueLabel(task.due_date);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className={STATUS_STYLE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
            <DifficultyStars value={task.difficulty} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {task.status !== "completed" && (
            <Link href={`/tasks/${task.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label="编辑">
              <Pencil />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="删除"
            onClick={async () => {
              if (!confirm("确定删除这个任务吗？")) return;
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
        <Info icon={User} label="负责人" value={nameOf(task.assigned_to)} />
        {due && <Info icon={CalendarDays} label="日期" value={due} />}
        {task.estimated_minutes && <Info icon={Clock} label="预估" value={formatMinutes(task.estimated_minutes)} />}
        {task.recurrence_type !== "none" && (
          <Info icon={Repeat} label="重复" value={recurrenceLabel(task.recurrence_type, task.recurrence_value)} />
        )}
      </div>

      {/* Rejection feedback */}
      {task.status === "rejected" && latestReview?.status === "rejected" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 text-sm">
            <p className="font-medium text-destructive">{nameOf(latestReview.reviewer_id)} 驳回了这个任务</p>
            {latestReview.comment && <p className="mt-1">“{latestReview.comment}”</p>}
          </CardContent>
        </Card>
      )}

      {/* Timer + actions */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <TimerDisplay sessions={sessions} />
          {task.status === "in_progress" && active?.paused_at && <p className="text-sm text-muted-foreground">已暂停</p>}

          <div className="flex w-full flex-col gap-2">
            {task.status === "pending" && (
              <>
                <Button size="lg" disabled={busy} onClick={() => run(() => claimTask(task.id, me.id))}>
                  我来做
                </Button>
                <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => startTask(task.id, me.id))}>
                  <Play /> 认领并开始
                </Button>
              </>
            )}

            {(task.status === "claimed" || task.status === "rejected") &&
              (isMine ? (
                <Button size="lg" disabled={busy} onClick={() => run(() => startTask(task.id, me.id))}>
                  <Play /> {task.status === "rejected" ? "重新开始" : "开始"}
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">等待 {nameOf(task.assigned_to)} 开始</p>
              ))}

            {task.status === "in_progress" &&
              (isMine ? (
                <>
                  {active &&
                    (active.paused_at ? (
                      <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => resumeSession(active))}>
                        <Play /> 继续
                      </Button>
                    ) : (
                      <Button size="lg" variant="outline" disabled={busy} onClick={() => run(() => pauseSession(active))}>
                        <Pause /> 暂停
                      </Button>
                    ))}
                  <Button size="lg" disabled={busy} onClick={() => run(() => submitTask(task.id, active))}>
                    <Send /> 完成，提交给{partner?.name || "TA"}确认
                  </Button>
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">{nameOf(task.assigned_to)} 正在做 💪</p>
              ))}

            {task.status === "review" &&
              (isMine ? (
                <p className="text-center text-sm text-muted-foreground">
                  已提交，等待 {partner?.name || "TA"} 确认 · 预计 {calcPoints(task.difficulty, totalMinutes)} 分
                </p>
              ) : rejecting ? (
                <div className="flex flex-col gap-2">
                  <Textarea placeholder="告诉 TA 哪里还需要改进（可选）" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setRejecting(false)}>
                      取消
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
                      确认驳回
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    {nameOf(task.assigned_to)} 用时 {formatMinutes(totalMinutes)}，确认后获得{" "}
                    <span className="font-semibold text-foreground">{calcPoints(task.difficulty, totalMinutes)}</span> 分
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline" onClick={() => setRejecting(true)}>
                      <X /> 驳回
                    </Button>
                    <Button size="lg" variant="success" disabled={busy} onClick={() => run(() => reviewTask(task.id, true))}>
                      <Check /> 确认完成
                    </Button>
                  </div>
                </>
              ))}

            {task.status === "completed" && latestReview?.status === "approved" && (
              <p className="text-center text-sm">
                🎉 {nameOf(latestReview.reviewer_id)} 已确认 · {nameOf(latestReview.earned_by)} 获得{" "}
                <span className="font-semibold">{latestReview.points_awarded}</span> 分
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* History */}
      {(sessions.length > 0 || reviews.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">记录</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {[
              ...sessions.map((s) => ({
                at: s.started_at,
                text: `${nameOf(s.user_id)} ${s.ended_at ? `计时 ${formatMinutes(sessionSeconds(s) / 60)}` : "开始计时"}`,
              })),
              ...reviews.map((r) => ({
                at: r.created_at,
                text:
                  r.status === "approved"
                    ? `${nameOf(r.reviewer_id)} 确认完成 +${r.points_awarded} 分`
                    : `${nameOf(r.reviewer_id)} 驳回${r.comment ? `：${r.comment}` : ""}`,
              })),
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((e, i) => (
                <li key={i} className="flex justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                  <span>{e.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(e.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
