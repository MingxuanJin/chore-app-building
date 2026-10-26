"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveQuery } from "@/lib/supabase/realtime";
import { NOTIFICATION_ICON, notificationHref, notificationSubject, notificationText } from "@/lib/notifications";
import type { AppNotification } from "@/types/database";
import { useFamily } from "./family-provider";
import { useI18n } from "./i18n-provider";

interface NotificationsCtx {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<NotificationsCtx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { me, nameOf } = useFamily();
  const { t } = useI18n();

  const fetchNotifications = useCallback(async () => {
    const { data } = await createClient()
      .from("notifications")
      .select("*")
      .eq("recipient_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AppNotification[]>();
    return data ?? [];
  }, [me.id]);
  const { data, loading, reload } = useLiveQuery(fetchNotifications, ["notifications"]);
  const notifications = useMemo(() => data ?? [], [data]);

  // Toast for notifications that arrive while the app is open
  const [mountedAt] = useState(() => new Date().toISOString());
  const [dismissed, setDismissed] = useState<string | null>(null);
  const latest = notifications[0];
  const toast =
    latest && !latest.read_at && latest.created_at > mountedAt && latest.id !== dismissed ? latest : null;

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await createClient().from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      await reload();
    },
    [reload]
  );

  const markAllRead = useCallback(
    () => markRead(notifications.filter((n) => !n.read_at).map((n) => n.id)),
    [markRead, notifications]
  );

  const unread = notifications.filter((n) => !n.read_at).length;

  return (
    <Ctx.Provider value={{ notifications, unread, loading, markRead, markAllRead }}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-md items-center gap-3 rounded-lg border bg-card p-3 shadow-lg">
            <Link
              href={notificationHref(toast)}
              onClick={() => {
                setDismissed(toast.id);
                markRead([toast.id]);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-sm"
            >
              <ToastIcon type={toast.type} />
              <span className="min-w-0 flex-1">{notificationText(t, toast, nameOf(notificationSubject(toast)))}</span>
            </Link>
            <button onClick={() => setDismissed(toast.id)} className="p-1 text-muted-foreground" aria-label={t("common.close")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function ToastIcon({ type }: { type: AppNotification["type"] }) {
  const Icon = NOTIFICATION_ICON[type];
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
