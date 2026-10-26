export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}

/**
 * Runs in <head> before first paint so there's no light→dark flash.
 * Kept in sync with applyTheme() in theme-provider.tsx.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(\\w+)/);var t=m?m[1]:"system";var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
