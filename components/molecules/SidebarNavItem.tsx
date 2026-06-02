"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SidebarNavItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: boolean;
}

export function SidebarNavItem({
  label,
  href,
  icon: Icon,
  isActive,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
        isActive
          ? "bg-[#F0F7F1] text-[#2E7D32]"
          : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-gray-700",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-[#2E7D32]" : "text-gray-400",
        )}
      />
      <span>{label}</span>
    </Link>
  );
}
