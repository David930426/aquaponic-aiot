import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("settings.tab.thresholds") };
}

export default function ThresholdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
