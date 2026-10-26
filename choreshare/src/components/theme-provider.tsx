"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

interface ThemeCtx {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Per-device theme stored in a cookie; "system" follows the OS setting live. */
export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setThemeState(next);
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
