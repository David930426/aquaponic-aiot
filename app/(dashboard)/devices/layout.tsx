import type { Metadata } from "next";

import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return { title: t("nav.devices") };
}

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
