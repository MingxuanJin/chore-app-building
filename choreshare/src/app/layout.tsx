import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { I18nProvider } from "@/components/i18n-provider";
import { DATE_LOCALE } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";

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
  themeColor: "#7c3aed",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  return (
    <html lang={DATE_LOCALE[locale]}>
      <body className={inter.className}>
        <I18nProvider locale={locale}>
          <main className="min-h-screen">{children}</main>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
