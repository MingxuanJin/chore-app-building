"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { useI18n } from "./i18n-provider";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={t("common.language")} />
      <div className="grid flex-1 grid-cols-3 rounded-md bg-muted p-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            onClick={() => setLocale(l)}
            className={cn(
              "rounded px-2 py-1 text-sm transition-colors",
              locale === l ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
            )}
          >
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
