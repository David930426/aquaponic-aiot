"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  Globe,
  Menu,
  Search,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { getInitials } from "@/lib/utils";
import { useAlertStore } from "@/store/useAlertStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const avatarVersion = useAuthStore((s) => s.avatarVersion);
  const logout = useAuthStore((s) => s.logout);
  const toggleSheet = useAlertStore((s) => s.toggleSheet);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const openSearch = useUiStore((s) => s.setSearchOpen);
  const { t } = useT();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#EAECEF] bg-white px-3 sm:gap-4 sm:px-6">
      {/* Mobile hamburger — opens the sidebar drawer */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </Button>

      {/* Search trigger — read-only "input" on >= sm acts as a button that
          opens the search palette. The real search input lives in the dialog
          so desktop and mobile share a single code path. */}
      <button
        type="button"
        onClick={() => openSearch(true)}
        className="hidden h-9 w-full max-w-95 flex-1 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-left text-sm text-gray-500 transition-colors hover:bg-white hover:text-gray-700 sm:flex"
      >
        <Search className="h-4 w-4 text-gray-400" />
        <span className="flex-1 truncate">
          {t("topbar.searchPlaceholder")}
        </span>
        <kbd className="hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-500 md:inline">
          ⌘K
        </kbd>
      </button>
      {/* Mobile: search icon opens the same dialog */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => openSearch(true)}
        aria-label={t("search.openShortcut")}
      >
        <Search className="h-4.5 w-4.5 text-gray-500" />
      </Button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
                {user ? (
                  <AvatarImage
                    src={`/api/profile/avatar/${user.id}${
                      avatarVersion ? `?v=${avatarVersion}` : ""
                    }`}
                    alt={user.name}
                  />
                ) : null}
                <AvatarFallback className="bg-[#E8F5E9] text-xs text-[#2E7D32]">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-gray-700 sm:inline">
                {user?.name ?? t("topbar.userGuest")}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              {t("topbar.profile")}
            </DropdownMenuItem>
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

        {/* Settings — collapses to icon-only below md */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-1.5 px-2 text-sm text-gray-600"
              aria-label={t("topbar.settings")}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">{t("topbar.settings")}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 md:inline" />
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
