"use client";

import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFamily } from "@/components/family-provider";
import { useNotifications } from "@/components/notifications-provider";
import { NOTIFICATION_ICON, notificationHref, notificationSubject, notificationText, timeAgo } from "@/lib/notifications";

export default function NotificationsPage() {
  const { nameOf } = useFamily();
  const { notifications, unread, loading, markRead, markAllRead } = useNotifications();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">通知</h1>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>
            <CheckCheck /> 全部已读
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">加载中…</p>
      ) : notifications.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">暂时没有通知 🔕</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = NOTIFICATION_ICON[n.type];
            return (
              <li key={n.id}>
                <Link
                  href={notificationHref(n)}
                  onClick={() => !n.read_at && markRead([n.id])}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/50",
                    n.read_at ? "bg-card text-muted-foreground" : "border-primary/30 bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      n.read_at ? "bg-muted" : "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block", !n.read_at && "font-medium text-foreground")}>
                      {notificationText(n, nameOf(notificationSubject(n)))}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="未读" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
