export const LOCALES = ["zh", "en", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  it: "Italiano",
};

/** BCP 47 tag for Intl date/number formatting */
export const DATE_LOCALE: Record<Locale, string> = {
  zh: "zh-CN",
  en: "en-GB",
  it: "it-IT",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Pick the best supported locale from an Accept-Language header */
export function matchAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => isLocale(p.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE;
}
