import { Check, CircleAlert, Gift, Hand, ListTodo, PartyPopper, ShoppingCart, Trophy, UserPlus } from "lucide-react";
import type { AppNotification, NotificationType } from "@/types/database";

// Rendered client-side from structured data so each reader can get their own language.
type Render = (n: AppNotification, actor: string) => string;

const TEXT: Record<NotificationType, Render> = {
  task_assigned: (n, a) => `${a}把「${n.data.title}」分配给了你`,
  task_claimed: (n, a) => `${a}认领了「${n.data.title}」`,
  task_submitted: (n, a) => `${a}完成了「${n.data.title}」，等你确认`,
  task_approved: (n, a) => `${a}确认了「${n.data.title}」，你获得 ${n.data.points ?? 0} 分 🎉`,
  task_rejected: (n, a) => `${a}驳回了「${n.data.title}」${n.data.comment ? `：“${n.data.comment}”` : ""}`,
  reward_redeemed: (n, a) => `${a}兑换了「${n.data.name}」，等你履行`,
  milestone_unlocked: (n, a) => `${a}解锁了里程碑「${n.data.name}」，等你履行`,
  reward_fulfilled: (n, a) => `${a}兑现了你的「${n.data.name}」💝`,
  shopping_assigned: (n, a) => `${a}请你去买「${n.data.name}」`,
};

export const NOTIFICATION_ICON: Record<NotificationType, React.ElementType> = {
  task_assigned: UserPlus,
  task_claimed: Hand,
  task_submitted: ListTodo,
  task_approved: Check,
  task_rejected: CircleAlert,
  reward_redeemed: Gift,
  milestone_unlocked: Trophy,
  reward_fulfilled: PartyPopper,
  shopping_assigned: ShoppingCart,
};

/** Whose action the notification is about */
export function notificationSubject(n: AppNotification): string | null {
  return n.data.user ?? n.actor_id;
}

export function notificationText(n: AppNotification, subjectName: string): string {
  return TEXT[n.type]?.(n, subjectName) ?? "";
}

export function notificationHref(n: AppNotification): string {
  if (n.task_id) return `/tasks/${n.task_id}`;
  if (n.type === "shopping_assigned") return "/shopping";
  if (n.reward_id) return "/rewards";
  return "/dashboard";
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}
