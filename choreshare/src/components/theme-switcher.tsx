"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/theme";
import type { TKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { useTheme } from "./theme-provider";

const OPTIONS: { value: Theme; label: TKey; icon: React.ElementType }[] = [
  { value: "system", label: "settings.themeSystem", icon: Monitor },
  { value: "light", label: "settings.themeLight", icon: Sun },
  { value: "dark", label: "settings.themeDark", icon: Moon },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-3 rounded-md bg-muted p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors",
            theme === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {t(label)}
        </button>
      ))}
    </div>
  );
}
