"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { Segmented } from "./ui/segmented";
import { useI18n } from "./i18n-provider";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={t("common.language")} />
      <Segmented
        className="flex-1"
        value={locale}
        onChange={setLocale}
        options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l], lang: l }))}
      />
    </div>
  );
}
