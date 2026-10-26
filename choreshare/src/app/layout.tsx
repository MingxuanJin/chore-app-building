import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Courier_Prime, EB_Garamond, Noto_Serif_SC, Pinyon_Script } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { I18nProvider } from "@/components/i18n-provider";
import { DATE_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";

// Fawnlight type: Cormorant (headings), EB Garamond (body), Courier Prime (labels), Pinyon Script (brand)
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-cormorant" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-eb-garamond" });
const courierPrime = Courier_Prime({ subsets: ["latin"], weight: "400", variable: "--font-courier-prime" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon" });
// Chinese fallback; served in unicode-range slices, so no preload
const notoSerifSC = Noto_Serif_SC({ weight: ["400", "600"], preload: false, variable: "--font-noto-serif-sc" });
const fontVars = [cormorant, ebGaramond, courierPrime, pinyon, notoSerifSC].map((f) => f.variable).join(" ");

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
  themeColor: "#faf6f3",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  return (
    <html lang={DATE_LOCALE[locale]} className={fontVars}>
      <body>
        <I18nProvider locale={locale}>
          <main className="min-h-screen">{children}</main>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
