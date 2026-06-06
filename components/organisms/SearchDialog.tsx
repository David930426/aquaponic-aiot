"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Search,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDevices } from "@/hooks/useDevices";
import { useT } from "@/hooks/useT";
import { deviceIconMap } from "@/components/molecules/device-meta";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";
import { useZoneStore } from "@/store/useZoneStore";
import type { DeviceType } from "@/types/api";

// Each result row carries everything we need to render + navigate.
interface BaseResult {
  id: string;
  group: "devices" | "pages";
  label: string;
  description?: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

// Navigation index. Keep in sync with Sidebar.tsx.
const PAGES: { labelKey: MessageKey; href: string; Icon: LucideIcon }[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { labelKey: "nav.devices", href: "/devices", Icon: Cpu },
  { labelKey: "nav.analytics", href: "/analytics", Icon: TrendingUp },
  { labelKey: "nav.schedules", href: "/schedules", Icon: CalendarDays },
  { labelKey: "nav.alerts", href: "/alerts", Icon: Bell },
  { labelKey: "nav.testing", href: "/testing", Icon: FlaskConical },
  { labelKey: "nav.settings", href: "/settings", Icon: Settings },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").trim();
}

function scoreMatch(target: string, query: string): number {
  // Cheap fuzzy: prefer prefix > word-start > substring > none.
  if (!query) return 1;
  const t = normalize(target);
  const q = normalize(query);
  if (t.startsWith(q)) return 3;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  if (t.includes(q)) return 1;
  return 0;
}

export function SearchDialog() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const { t } = useT();
  const router = useRouter();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data: devicesData } = useDevices(zoneId);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset query whenever the palette closes so reopening starts clean.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  // Results are returned as a flat array in the SAME visual order the dialog
  // renders them: device group first (sorted by score), then page group
  // (sorted by score). Keeping the flat order aligned with the visual order
  // means activeIndex from keyboard navigation always matches the rendered
  // row at that position.
  const results = useMemo<BaseResult[]>(() => {
    const devices: { r: BaseResult; score: number }[] = [];
    const pages: { r: BaseResult; score: number }[] = [];

    for (const d of devicesData?.devices ?? []) {
      const score = Math.max(
        scoreMatch(d.name, query),
        scoreMatch(d.deviceType, query) * 0.5,
      );
      if (score === 0 && query) continue;
      const meta = deviceIconMap[d.deviceType as DeviceType];
      devices.push({
        score,
        r: {
          id: `device:${d.id}`,
          group: "devices",
          label: d.name,
          description: d.deviceType.replace(/_/g, " "),
          href: `/devices#${d.id}`,
          Icon: meta?.icon ?? Cpu,
          iconColor: meta?.iconColor,
          iconBg: meta?.iconBg,
        },
      });
    }

    for (const p of PAGES) {
      const label = t(p.labelKey);
      const score = scoreMatch(label, query);
      if (score === 0 && query) continue;
      pages.push({
        score,
        r: {
          id: `page:${p.href}`,
          group: "pages",
          label,
          href: p.href,
          Icon: p.Icon,
        },
      });
    }

    devices.sort((a, b) => b.score - a.score);
    pages.sort((a, b) => b.score - a.score);
    return [...devices, ...pages].slice(0, 20).map((x) => x.r);
  }, [devicesData, query, t]);

  // Clamp activeIndex when result list shrinks.
  if (activeIndex > results.length - 1 && results.length > 0) {
    setActiveIndex(0);
  }

  // Auto-focus input on open; restore focus to body on close.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Global Cmd/Ctrl+K opens the palette; "/" works too when no field is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement);
      if (isShortcut || isSlash) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) {
        router.push(r.href);
        setOpen(false);
      }
    }
  };

  // Keep the active row scrolled into view as the user arrows down/up.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // Group results for rendering. Order matches the global `results` array so
  // `pagesStart = devices.length` lines up the flat keyboard index with the
  // rendered group sections.
  const grouped = useMemo(() => {
    const devices = results.filter((r) => r.group === "devices");
    const pages = results.filter((r) => r.group === "pages");
    return { devices, pages, pagesStart: devices.length };
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[10%] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[15%]">
        <DialogTitle className="sr-only">{t("search.placeholder")}</DialogTitle>

        <div className="flex items-center gap-3 border-b border-[#EAECEF] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            className="h-9 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden rounded border border-[#E4E7EC] bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto px-2 py-2"
          onKeyDown={onKeyDown}
        >
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
              {query
                ? t("search.empty", { query })
                : t("search.initial")}
            </p>
          ) : (
            <>
              {grouped.devices.length > 0 && (
                <ResultGroup
                  label={t("search.group.devices")}
                  count={grouped.devices.length}
                >
                  {grouped.devices.map((r, i) => (
                    <ResultRow
                      key={r.id}
                      result={r}
                      active={i === activeIndex}
                      index={i}
                      onSelect={() => {
                        router.push(r.href);
                        setOpen(false);
                      }}
                      onHover={() => setActiveIndex(i)}
                    />
                  ))}
                </ResultGroup>
              )}
              {grouped.pages.length > 0 && (
                <ResultGroup
                  label={t("search.group.pages")}
                  count={grouped.pages.length}
                >
                  {grouped.pages.map((r, i) => {
                    const idx = grouped.pagesStart + i;
                    return (
                      <ResultRow
                        key={r.id}
                        result={r}
                        active={idx === activeIndex}
                        index={idx}
                        onSelect={() => {
                          router.push(r.href);
                          setOpen(false);
                        }}
                        onHover={() => setActiveIndex(idx)}
                      />
                    );
                  })}
                </ResultGroup>
              )}
            </>
          )}
        </div>

        <div className="hidden items-center justify-between border-t border-[#EAECEF] px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span>{t("search.hint")}</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#E4E7EC] bg-muted px-1.5 py-0.5 font-medium">
              ↑
            </kbd>
            <kbd className="rounded border border-[#E4E7EC] bg-muted px-1.5 py-0.5 font-medium">
              ↓
            </kbd>
            <kbd className="ml-1 rounded border border-[#E4E7EC] bg-muted px-1.5 py-0.5 font-medium">
              ↵
            </kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1 py-1">
      <div className="flex items-center justify-between px-2 pb-1 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-[11px] text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({
  result,
  active,
  index,
  onSelect,
  onHover,
}: {
  result: BaseResult;
  active: boolean;
  index: number;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      data-result-index={index}
      onClick={onSelect}
      onMouseMove={onHover}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
        active ? "bg-[#E8F5E9] text-[#2E7D32]" : "hover:bg-muted",
      )}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: result.iconBg ?? "#F4F6F8" }}
        aria-hidden
      >
        <result.Icon
          className="h-4 w-4"
          style={{ color: result.iconColor ?? "#6B7280" }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {result.label}
        </p>
        {result.description && (
          <p className="truncate text-xs capitalize text-muted-foreground">
            {result.description}
          </p>
        )}
      </div>
    </button>
  );
}
