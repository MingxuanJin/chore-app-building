"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { THEME_COOKIE, type Theme } from "@/lib/theme/config";

interface ThemeCtx {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

/** `theme` comes from the server (cookie); `<html data-theme>` is rendered by the root layout. */
export function ThemeProvider({ theme: serverTheme, children }: { theme: Theme; children: React.ReactNode }) {
  const router = useRouter();
  const [theme, setThemeState] = useState(serverTheme);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      document.documentElement.dataset.theme = next;
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // re-render server parts (theme-color meta)
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
