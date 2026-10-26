"use client";

import type { TKey } from "@/lib/i18n/translate";
import { useI18n } from "./i18n-provider";

/** Translated <h1> for server-rendered pages */
export function PageTitle({ k }: { k: TKey }) {
  const { t } = useI18n();
  return <h1 className="text-xl font-bold">{t(k)}</h1>;
}
