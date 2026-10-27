export const THEMES = ["fawnlight", "caramel", "cocoa"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "fawnlight";
export const THEME_COOKIE = "theme";

/** 布丁布丁 design system: caramel = its light mode, cocoa = its dark mode */
export const isPudding = (theme: Theme) => theme !== "fawnlight";

/** Browser chrome / PWA status bar colour per theme (the page background) */
export const THEME_COLOR: Record<Theme, string> = {
  fawnlight: "#faf6f3",
  caramel: "#fffbe6",
  cocoa: "#231a12",
};

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}
