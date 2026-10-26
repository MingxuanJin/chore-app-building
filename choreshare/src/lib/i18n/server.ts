import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, matchAcceptLanguage, type Locale } from "./config";

/** Locale for signed-out pages: cookie, then browser language, then English. */
export async function getRequestLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return matchAcceptLanguage((await headers()).get("accept-language"));
}
