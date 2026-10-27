import type { RecurrenceType, RecurrenceValue, Task, TaskSession, TaskStatus } from "@/types/database";
import type { TFunction } from "@/lib/i18n/translate";

// Fawnlight tags: soft fills behind ink text
export const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "bg-kraft",
  claimed: "bg-blush",
  in_progress: "bg-silver",
  review: "bg-primary text-primary-foreground",
  completed: "bg-sage",
  rejected: "bg-danger-soft text-destructive",
};

/** Short weekday names, index 0 = Sunday */
export function weekdays(t: TFunction): string[] {
  return t("time.weekdays").split(",");
}

export function recurrenceLabel(t: TFunction, type: RecurrenceType, value: RecurrenceValue | null): string {
  switch (type) {
    case "daily":
      return t("recurrence.daily");
    case "every_n_days":
      return t("recurrence.everyN", { n: value?.interval ?? 1 });
    case "weekly": {
      if (!value?.days?.length) return t("recurrence.weekly");
      const names = weekdays(t);
      const days = [...value.days].sort().map((d) => names[d]).join(t("time.listSep"));
      return t("recurrence.weeklyOn", { days });
    }
    case "monthly":
      return t("recurrence.monthly", { day: value?.day ?? 1 });
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

export function formatMinutes(t: TFunction, minutes: number): string {
  if (minutes < 60) return t("time.minutes", { n: Math.round(minutes) });
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? t("time.hoursMinutes", { h, m }) : t("time.hours", { h });
}

/** Local date as YYYY-MM-DD, `offsetDays` from today */
export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "26 Oct" / "10月26日" for a YYYY-MM-DD date */
export function formatShortDate(iso: string, dateLocale: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
}

export function isActive(t: Task): boolean {
  return t.status !== "completed";
}

export function dueLabel(t: TFunction, dateLocale: string, due: string | null): string | null {
  if (!due) return null;
  const today = todayISO();
  if (due === today) return t("time.today");
  if (due < today) return t("time.overdue", { date: formatShortDate(due, dateLocale) });
  if (due === todayISO(1)) return t("time.tomorrow");
  return formatShortDate(due, dateLocale);
}
