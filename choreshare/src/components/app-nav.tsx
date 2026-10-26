"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Gift, Heart, Home, ListTodo, Settings, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFamily } from "./family-provider";

const NAV = [
  { href: "/dashboard", label: "首页", icon: Home },
  { href: "/tasks", label: "任务", icon: ListTodo },
  { href: "/shopping", label: "购物", icon: ShoppingCart },
  { href: "/rewards", label: "奖励", icon: Gift },
  { href: "/stats", label: "统计", icon: BarChart3 },
];

export function AppHeader() {
  const { family } = useFamily();
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Heart className="h-5 w-5 text-primary" fill="currentColor" />
          {family.name}
        </Link>
        <Link href="/settings" className="rounded-md p-2 text-muted-foreground hover:bg-accent" aria-label="设置">
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-xs",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
