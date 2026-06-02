"use client";

import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, Globe, Search, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/hooks/useNotifications";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { getInitials } from "@/lib/utils";
import { useAlertStore } from "@/store/useAlertStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleSheet = useAlertStore((s) => s.toggleSheet);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const { t } = useT();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[#EAECEF] bg-white px-6">
      <div className="w-full max-w-95 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("topbar.searchPlaceholder")}
            className="h-9 border-gray-200 bg-gray-50 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("topbar.language")}
            >
              <Globe className="h-4.5 w-4.5 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("topbar.language")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocale("en")}>
              <span className="flex-1">{t("topbar.language.en")}</span>
              {locale === "en" && (
                <Check className="ml-2 h-3.5 w-3.5 text-[#2E7D32]" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale("zh-TW")}>
              <span className="flex-1">{t("topbar.language.zh")}</span>
              {locale === "zh-TW" && (
                <Check className="ml-2 h-3.5 w-3.5 text-[#2E7D32]" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={toggleSheet}
          aria-label={t("topbar.alertsAria", { count: unreadCount })}
        >
          <Bell className="h-4.5 w-4.5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#E8F5E9] text-xs text-[#2E7D32]">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                {user?.name ?? t("topbar.userGuest")}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>{t("topbar.profile")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[#B91C1C]"
              onClick={async () => {
                try {
                  await api.post("/api/auth/logout");
                } catch {
                  // best-effort
                }
                logout();
                router.push("/login");
              }}
            >
              {t("topbar.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-1.5 px-2 text-sm text-gray-600"
            >
              <Settings className="h-4 w-4" />
              {t("topbar.settings")}
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              {t("topbar.settings.thresholds")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              {t("topbar.settings.zones")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              {t("topbar.settings.notifications")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
