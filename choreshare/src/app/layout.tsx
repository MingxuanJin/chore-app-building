import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { I18nProvider } from "@/components/i18n-provider";
import { DATE_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_COOKIE, THEME_INIT_SCRIPT, isTheme } from "@/lib/theme";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChoreShare",
  description: "Share chores fairly as a couple · 情侣家务分配 · Faccende di coppia",
  applicationName: "ChoreShare",
  appleWebApp: { capable: true, title: "ChoreShare", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  const themeCookie = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : "system";
  return (
    // the init script sets the "dark" class before React hydrates
    <html lang={DATE_LOCALE[locale]} className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider initialTheme={theme}>
          <I18nProvider locale={locale}>
            <main className="min-h-screen">{children}</main>
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
