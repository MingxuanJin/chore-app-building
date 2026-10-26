import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChoreShare",
  description: "情侣家务分配与记录",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <main className="min-h-screen">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
