"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Gift, Home, ListTodo, Settings, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamily } from "./family-provider";
import { useNotifications } from "./notifications-provider";
import { useI18n } from "./i18n-provider";
import type { TKey } from "@/lib/i18n/translate";
import { Art } from "./fawn";

const NAV: { href: string; label: TKey; icon: React.ElementType }[] = [
  { href: "/dashboard", label: "nav.home", icon: Home },
  { href: "/tasks", label: "nav.tasks", icon: ListTodo },
  { href: "/shopping", label: "nav.shopping", icon: ShoppingCart },
  { href: "/rewards", label: "nav.rewards", icon: Gift },
  { href: "/stats", label: "nav.stats", icon: BarChart3 },
];

export function AppHeader() {
  const { family } = useFamily();
  const { unread } = useNotifications();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <Art name="bow" className="w-9" priority />
          <span className="truncate font-serif text-[22px] font-medium italic">{family.name}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative rounded-full p-2 text-muted-foreground hover:bg-accent"
            aria-label={unread ? t("nav.notificationsUnread", { n: unread }) : t("nav.notifications")}
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 font-mono text-[10px] text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link href="/settings" className="rounded-full p-2 text-muted-foreground hover:bg-accent" aria-label={t("nav.settings")}>
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
      <div className="fl-trim" aria-hidden />
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-xs",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className={cn("rounded-full px-4 py-1 transition-colors", active && "bg-blush")}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              </span>
              {t(label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
