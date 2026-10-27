import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Courier_Prime, EB_Garamond, Noto_Serif_SC, Pinyon_Script, ZCOOL_KuaiLe, Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { DATE_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { THEME_COLOR } from "@/lib/theme/config";
import { getRequestTheme } from "@/lib/theme/server";

// Fawnlight type: Cormorant (headings), EB Garamond (body), Courier Prime (labels), Pinyon Script (brand)
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-eb-garamond" });
const courierPrime = Courier_Prime({ subsets: ["latin"], weight: "400", variable: "--font-courier-prime" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon" });
// Chinese fallback; served in unicode-range slices, so no preload
const notoSerifSC = Noto_Serif_SC({ weight: ["400", "600"], preload: false, variable: "--font-noto-serif-sc" });
// 布丁布丁 themes: rounded Latin faces (Nunito body, Fredoka headings) for easy reading in English / Italian,
// with ZCOOL KuaiLe (the design system's fallback for Allseto) for Chinese. Not preloaded: only fetched when used.
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700"], preload: false, variable: "--font-nunito" });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600"], preload: false, variable: "--font-fredoka" });
const kuaile = ZCOOL_KuaiLe({ weight: "400", preload: false, variable: "--font-kuaile" });
const fontVars = [cormorant, ebGaramond, courierPrime, pinyon, notoSerifSC, nunito, fredoka, kuaile].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "BunnyChore",
  description: "Share chores fairly as a couple · 情侣家务分配 · Faccende di coppia",
  applicationName: "BunnyChore",
  appleWebApp: { capable: true, title: "BunnyChore", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export async function generateViewport(): Promise<Viewport> {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: THEME_COLOR[await getRequestTheme()],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, theme] = await Promise.all([getRequestLocale(), getRequestTheme()]);
  return (
    <html lang={DATE_LOCALE[locale]} className={fontVars} data-theme={theme}>
      <body>
        <ThemeProvider theme={theme}>
          <I18nProvider locale={locale}>
            <main className="min-h-screen">{children}</main>
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
