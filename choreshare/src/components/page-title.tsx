"use client";

import type { TKey } from "@/lib/i18n/translate";
import { useI18n } from "./i18n-provider";
import { PageHeader } from "./fawn";

/** Translated page header for server-rendered pages */
export function PageTitle({ k }: { k: TKey }) {
  const { t } = useI18n();
  return <PageHeader eyebrow={t("deco.newTask")} title={t(k)} art="lilyPetal" />;
}
