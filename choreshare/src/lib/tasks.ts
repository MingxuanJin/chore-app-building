import type { RecurrenceType, RecurrenceValue, Task, TaskSession, TaskStatus } from "@/types/database";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待认领",
  claimed: "待办",
  in_progress: "进行中",
  review: "待确认",
  completed: "已完成",
  rejected: "被驳回",
};

export const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "border-warning/40 bg-warning/10 text-warning",
  claimed: "border-primary/30 bg-primary/10 text-primary",
  in_progress: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  review: "border-orange-500/30 bg-orange-500/10 text-orange-600",
  completed: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function recurrenceLabel(type: RecurrenceType, value: RecurrenceValue | null): string {
  switch (type) {
    case "daily":
      return "每天";
    case "every_n_days":
      return `每 ${value?.interval ?? 1} 天`;
    case "weekly":
      return value?.days?.length
        ? `每周${[...value.days].sort().map((d) => WEEKDAYS[d]).join("、")}`
        : "每周";
    case "monthly":
      return `每月 ${value?.day ?? 1} 日`;
    default:
      return "";
  }
}

/** 积分 = 难度 × ceil(实际用时分钟 / 15)，与数据库 review_task 保持一致 */
export function calcPoints(difficulty: number, minutes: number): number {
  return difficulty * Math.max(Math.ceil(minutes / 15), 1);
}

/** Seconds of work in a session, excluding pauses. Works for running sessions too. */
export function sessionSeconds(s: TaskSession, now = Date.now()): number {
  const start = new Date(s.started_at).getTime();
  const end = s.ended_at
    ? new Date(s.ended_at).getTime()
    : s.paused_at
      ? new Date(s.paused_at).getTime()
      : now;
  return Math.max(0, Math.floor((end - start) / 1000) - s.paused_duration_seconds);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

/** Local date as YYYY-MM-DD, `offsetDays` from today */
export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isActive(t: Task): boolean {
  return t.status !== "completed";
}

export function dueLabel(due: string | null): string | null {
  if (!due) return null;
  const today = todayISO();
  if (due === today) return "今天";
  if (due < today) return `已逾期 · ${due.slice(5)}`;
  if (due === todayISO(1)) return "明天";
  return due.slice(5);
}
