import type { MilestoneCondition, MilestoneType } from "@/types/database";

export const MILESTONE_TYPES: { type: MilestoneType; label: string; unit: string; defaultTarget: number }[] = [
  { type: "streak_days", label: "连续完成天数", unit: "天", defaultTarget: 7 },
  { type: "monthly_completion", label: "月度完成率", unit: "%", defaultTarget: 100 },
  { type: "total_tasks", label: "累计完成任务", unit: "个", defaultTarget: 50 },
  { type: "total_points", label: "累计获得积分", unit: "分", defaultTarget: 500 },
];

export function describeMilestone(c: MilestoneCondition | null): string {
  if (!c) return "";
  switch (c.type) {
    case "streak_days":
      return `连续 ${c.target} 天完成家务`;
    case "monthly_completion":
      return `月度完成率达到 ${c.target}%`;
    case "total_tasks":
      return `累计完成 ${c.target} 个任务`;
    case "total_points":
      return `累计获得 ${c.target} 积分`;
  }
}

/** Progress line under the bar, e.g. "已连续 3 天" */
export function progressLabel(c: MilestoneCondition, progress: number): string {
  switch (c.type) {
    case "streak_days":
      return `已连续 ${progress} 天`;
    case "monthly_completion":
      return `本月目前 ${progress}%（按上月结算）`;
    case "total_tasks":
      return `${progress} / ${c.target} 个`;
    case "total_points":
      return `${progress} / ${c.target} 分`;
  }
}

/** Human label for an unlock's period_key */
export function periodLabel(key: string | null): string {
  if (!key || key === "once") return "";
  if (key.startsWith("month:")) return key.slice(6).replace("-", " 年 ") + " 月";
  if (key.startsWith("streak:")) return `${key.slice(12)} 起`;
  return "";
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
