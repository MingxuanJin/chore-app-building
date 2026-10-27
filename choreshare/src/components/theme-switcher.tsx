"use client";

import { Check } from "lucide-react";
import { THEMES, type Theme } from "@/lib/theme/config";
import type { TKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";
import { useTheme } from "./theme-provider";

/** Each choice previews its own ground, ink and fill, whatever theme is active */
const SWATCH: Record<Theme, { ground: string; ink: string; fill: string; accent: string }> = {
  fawnlight: { ground: "#faf6f3", ink: "#4a3530", fill: "#e3b6c0", accent: "#9a5068" },
  caramel: { ground: "#fffbe6", ink: "#4a2c1e", fill: "#fff2a6", accent: "#8a5a3b" },
  cocoa: { ground: "#231a12", ink: "#fbf1d8", fill: "#f2d675", accent: "#d9a27a" },
};

const NAME: Record<Theme, TKey> = {
  fawnlight: "settings.themeFawnlight",
  caramel: "settings.themeCaramel",
  cocoa: "settings.themeCocoa",
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("settings.theme")}>
      {THEMES.map((id) => {
        const s = SWATCH[id];
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-md border p-2 text-sm transition-colors",
              active ? "border-rose bg-muted" : "hover:bg-accent"
            )}
          >
            <span
              className="relative flex h-12 w-full items-center justify-center gap-1.5 rounded-sm border"
              style={{ background: s.ground, borderColor: s.accent }}
              aria-hidden
            >
              <span className="h-5 w-5 rounded-full" style={{ background: s.fill }} />
              <span className="h-5 w-5 rounded-full" style={{ background: s.accent }} />
              <span className="h-5 w-5 rounded-full" style={{ background: s.ink }} />
              {active && (
                <Check className="absolute right-1 top-1 h-3.5 w-3.5" style={{ color: s.ink }} strokeWidth={2.5} />
              )}
            </span>
            <span className={cn("text-center leading-tight", active ? "text-foreground" : "text-muted-foreground")}>
              {t(NAME[id])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
