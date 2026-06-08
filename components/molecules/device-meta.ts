import {
  Activity,
  Atom,
  Droplets,
  FlaskConical,
  Gauge,
  Sun,
  Thermometer,
  UtensilsCrossed,
  Wind,
  type LucideIcon,
} from "lucide-react";

import type { DeviceStatus, DeviceType } from "@/types/api";

export interface DeviceIconMeta {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export const deviceIconMap: Record<DeviceType, DeviceIconMeta> = {
  pump: { icon: Gauge, iconBg: "#E8F5E9", iconColor: "#2E7D32" },
  aeration: { icon: Wind, iconBg: "#E8F5E9", iconColor: "#2E7D32" },
  sensor_temp: { icon: Thermometer, iconBg: "#E3F2FD", iconColor: "#1565C0" },
  sensor_ph: { icon: FlaskConical, iconBg: "#E3F2FD", iconColor: "#1565C0" },
  sensor_level: { icon: Droplets, iconBg: "#E3F2FD", iconColor: "#1565C0" },
  sensor_do: { icon: Atom, iconBg: "#E3F2FD", iconColor: "#1565C0" },
  sensor_flow: { icon: Activity, iconBg: "#E3F2FD", iconColor: "#1565C0" },
  feeder: { icon: UtensilsCrossed, iconBg: "#FFF8E1", iconColor: "#E65100" },
  lighting: { icon: Sun, iconBg: "#FFF9C4", iconColor: "#C77700" },
};

export const deviceStatusStyles: Record<DeviceStatus, string> = {
  running:
    "bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]",
  active:
    "bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]",
  calibrating:
    "bg-[#FFF8E1] text-[#E65100] border-transparent hover:bg-[#FFF8E1]",
  scheduled:
    "bg-[#E3F2FD] text-[#1565C0] border-transparent hover:bg-[#E3F2FD]",
  idle:
    "bg-[#F3F4F6] text-[#6B7280] border-transparent hover:bg-[#F3F4F6]",
  on:
    "bg-[#E8F5E9] text-[#2E7D32] border-transparent hover:bg-[#E8F5E9]",
  offline:
    "bg-[#FEF2F2] text-[#B91C1C] border-transparent hover:bg-[#FEF2F2]",
};

import type { MessageKey } from "@/lib/i18n/messages";

export const deviceStatusKey: Record<DeviceStatus, MessageKey> = {
  running: "deviceStatus.running",
  active: "deviceStatus.active",
  calibrating: "deviceStatus.calibrating",
  scheduled: "deviceStatus.scheduled",
  idle: "deviceStatus.idle",
  on: "deviceStatus.on",
  offline: "deviceStatus.offline",
};
