"use client";

import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Settings,
  TrendingUp,
} from "lucide-react";

import { SidebarNavItem } from "@/components/molecules/SidebarNavItem";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/lib/i18n/messages";

const navItems: {
  labelKey: MessageKey;
  href: string;
  icon: typeof LayoutDashboard;
}[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.devices", href: "/devices", icon: Cpu },
  { labelKey: "nav.analytics", href: "/analytics", icon: TrendingUp },
  { labelKey: "nav.schedules", href: "/schedules", icon: CalendarDays },
  { labelKey: "nav.alerts", href: "/alerts", icon: Bell },
  { labelKey: "nav.testing", href: "/testing", icon: FlaskConical },
  { labelKey: "nav.settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <aside className="sticky top-0 flex h-screen w-55 shrink-0 flex-col border-r border-[#EAECEF] bg-white">
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2E7D32]">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-gray-900">
              AquaWatch
            </p>
            <p className="text-[11px] leading-tight text-gray-400">
              {t("brand.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <Separator className="mx-4 w-auto" />

      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            label={t(item.labelKey)}
            href={item.href}
            icon={item.icon}
            isActive={
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </nav>

      <div className="px-4 pb-5 text-[11px] text-gray-400">v0.1.0 · 2026</div>
    </aside>
  );
}
