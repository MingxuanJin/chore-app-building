import { cookies } from "next/headers";
import { DEFAULT_THEME, THEME_COOKIE, isTheme, type Theme } from "./config";

/** Theme is chosen per device and kept in a cookie, so the server can render it without a flash. */
export async function getRequestTheme(): Promise<Theme> {
  const cookie = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(cookie) ? cookie : DEFAULT_THEME;
}
