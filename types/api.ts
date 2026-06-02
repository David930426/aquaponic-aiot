// ── Domain types ────────────────────────────────────────────────────────────
export type DeviceStatus =
  | "running"
  | "active"
  | "calibrating"
  | "scheduled"
  | "idle"
  | "on"
  | "offline";

export type DeviceType =
  | "pump"
  | "sensor_temp"
  | "sensor_ph"
  | "sensor_level"
  | "sensor_do"
  | "feeder"
  | "lighting"
  | "aeration";

export interface DeviceReading {
  label: string;
  value: string;
  raw: number | string | null;
  unit: string;
}

export interface Device {
  id: string;
  name: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  isEnabled: boolean;
  reading: DeviceReading | null;
}

export interface DevicesResponse {
  zoneId: string;
  zoneName: string;
  devices: Device[];
}

// ── Health summary ──────────────────────────────────────────────────────────
export interface HealthSummaryItem {
  key: "system_status" | "sensor_health" | "connection_stability";
  label: string;
  value: string;
  percent: number;
  state: "optimal" | "good" | "strong" | "warning" | "critical";
}

export interface HealthSummaryResponse {
  zoneId: string;
  updatedAt: number;
  summary: HealthSummaryItem[];
}

// ── Alerts ──────────────────────────────────────────────────────────────────
export type AlertSeverity = "warning" | "critical" | "info";

export interface AlertItem {
  id: string;
  deviceId: string;
  deviceName: string;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;
  isRead: boolean;
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export type KpiTrend =
  | "stable"
  | "increasing"
  | "decreasing"
  | "optimal"
  | "normal";

export interface KpiCard {
  key: "ph" | "temp" | "do" | "level";
  deviceId: string;
  value: number;
  unit: string;
  delta: number;
  trend: KpiTrend;
}

export interface KpisResponse {
  updatedAt: number;
  kpis: KpiCard[];
}

export interface WaterQualityPoint {
  ts: number;
  ph: number;
  temp: number;
  do: number;
}

export interface WaterQualityResponse {
  days: number;
  series: WaterQualityPoint[];
}

export interface SystemHealthResponse {
  zoneId: string;
  percent: number;
  overallLabel: string;
  sensorsOnline: number;
  sensorsTotal: number;
  pumpStatus: string;
}

// ── Schedules ───────────────────────────────────────────────────────────────
export interface ScheduleItem {
  id: string;
  deviceId: string | null;
  name: string;
  description: string | null;
  cron: string;
  action: string;
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

// ── Generic error ───────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  message: string;
}
