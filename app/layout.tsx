import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AquaWatch · 智慧魚菜共生 AIoT 監控儀表板",
    template: "%s · AquaWatch",
  },
  description: "Smart Aquaponics AIoT Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F4F6F8] font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
