import type { MilestoneCondition, MilestoneType } from "@/types/database";
import type { TFunction, TKey } from "@/lib/i18n/translate";
import { formatShortDate } from "@/lib/tasks";

export const MILESTONE_TYPES: { type: MilestoneType; label: TKey; unit: TKey; defaultTarget: number }[] = [
  { type: "streak_days", label: "milestones.typeStreak", unit: "milestones.unitDays", defaultTarget: 7 },
  { type: "monthly_completion", label: "milestones.typeMonthly", unit: "milestones.unitPercent", defaultTarget: 100 },
  { type: "total_tasks", label: "milestones.typeTotalTasks", unit: "milestones.unitTasks", defaultTarget: 50 },
  { type: "total_points", label: "milestones.typeTotalPoints", unit: "milestones.unitPoints", defaultTarget: 500 },
];

export function describeMilestone(t: TFunction, c: MilestoneCondition | null): string {
  if (!c) return "";
  switch (c.type) {
    case "streak_days":
      return t("milestones.descStreak", { n: c.target });
    case "monthly_completion":
      return t("milestones.descMonthly", { n: c.target });
    case "total_tasks":
      return t("milestones.descTotalTasks", { n: c.target });
    case "total_points":
      return t("milestones.descTotalPoints", { n: c.target });
  }
}

/** Progress line under the bar, e.g. "3-day streak" */
export function progressLabel(t: TFunction, c: MilestoneCondition, progress: number): string {
  switch (c.type) {
    case "streak_days":
      return t("milestones.progStreak", { n: progress });
    case "monthly_completion":
      return t("milestones.progMonthly", { n: progress });
    case "total_tasks":
      return t("milestones.progTotalTasks", { n: progress, target: c.target });
    case "total_points":
      return t("milestones.progTotalPoints", { n: progress, target: c.target });
  }
}

/** Human label for an unlock's period_key */
export function periodLabel(t: TFunction, dateLocale: string, key: string | null): string {
  if (!key || key === "once") return "";
  if (key.startsWith("month:")) {
    const [y, m] = key.slice(6).split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(dateLocale, { year: "numeric", month: "long" });
  }
  if (key.startsWith("streak:")) return t("milestones.periodStreak", { date: formatShortDate(key.slice(7), dateLocale) });
  return "";
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
