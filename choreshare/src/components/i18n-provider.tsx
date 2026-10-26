"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DATE_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { makeT, type TFunction } from "@/lib/i18n/translate";

interface I18nCtx {
  locale: Locale;
  /** BCP 47 tag for toLocaleDateString etc. */
  dateLocale: string;
  t: TFunction;
  setLocale: (locale: Locale) => Promise<void>;
}

const Ctx = createContext<I18nCtx | null>(null);

/**
 * `locale` comes from the server (profile → cookie → browser language).
 * Pass `userId` once signed in so a change is saved to the profile too.
 */
export function I18nProvider({
  locale: serverLocale,
  userId,
  children,
}: {
  locale: Locale;
  userId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(serverLocale);
  const [prevServerLocale, setPrevServerLocale] = useState(serverLocale);
  if (serverLocale !== prevServerLocale) {
    setPrevServerLocale(serverLocale);
    setLocaleState(serverLocale);
  }

  useEffect(() => {
    document.documentElement.lang = DATE_LOCALE[locale];
  }, [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      if (userId) await createClient().from("profiles").update({ locale: next }).eq("id", userId);
      router.refresh();
    },
    [router, userId]
  );

  const value = useMemo(
    () => ({ locale, dateLocale: DATE_LOCALE[locale], t: makeT(locale), setLocale }),
    [locale, setLocale]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
