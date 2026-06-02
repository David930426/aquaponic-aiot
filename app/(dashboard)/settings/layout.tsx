"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const tabs: { href: string; labelKey: MessageKey }[] = [
  { href: "/settings/thresholds", labelKey: "settings.tab.thresholds" },
  { href: "/settings/users", labelKey: "settings.tab.users" },
  { href: "/settings/data-source", labelKey: "settings.tab.dataSource" },
  { href: "/settings/api-keys", labelKey: "settings.tab.apiKeys" },
  { href: "/settings/ingest-docs", labelKey: "settings.tab.ingestDocs" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <div className="mx-auto max-w-275">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="mb-5 flex gap-1 border-b border-[#EAECEF]">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-[#2E7D32] text-[#2E7D32]"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
