import { Check, CircleAlert, Gift, Hand, ListTodo, PartyPopper, ShoppingCart, Trophy, UserPlus } from "lucide-react";
import type { AppNotification, NotificationType } from "@/types/database";
import type { TFunction } from "@/lib/i18n/translate";

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

// Rendered client-side from structured data so each reader gets their own language.
export function notificationText(t: TFunction, n: AppNotification, subjectName: string): string {
  const params = {
    name: subjectName,
    title: n.data.title ?? n.data.name ?? "",
    points: n.data.points ?? 0,
    comment: n.data.comment ?? "",
  };
  if (n.type === "task_rejected" && n.data.comment) return t("notifications.task_rejected_comment", params);
  return t(`notifications.${n.type}`, params);
}

export function notificationHref(n: AppNotification): string {
  if (n.task_id) return `/tasks/${n.task_id}`;
  if (n.type === "shopping_assigned") return "/shopping";
  if (n.reward_id) return "/rewards";
  return "/dashboard";
}

export function timeAgo(t: TFunction, dateLocale: string, iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t("time.justNow");
  if (s < 3600) return t("time.minutesAgo", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.hoursAgo", { n: Math.floor(s / 3600) });
  if (s < 86400 * 7) return t("time.daysAgo", { n: Math.floor(s / 86400) });
  return new Date(iso).toLocaleDateString(dateLocale);
}
