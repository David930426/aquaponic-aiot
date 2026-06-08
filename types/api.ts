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
  | "sensor_flow"
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
  // Editable config (returned for the management UI). apiToken is never sent
  // back to the client — `hasApiToken` just signals whether one is stored.
  apiUrl?: string | null;
  hasApiToken?: boolean;
  safeMin?: number | null;
  safeMax?: number | null;
  readingUnit?: string | null;
  simBaseline?: number | null;
  simAmplitude?: number | null;
  simNoise?: number | null;
}

/** Body shared by create/edit device forms. */
export interface DeviceInput {
  name: string;
  deviceType: DeviceType;
  apiUrl?: string | null;
  apiToken?: string | null;
  safeMin?: number | null;
  safeMax?: number | null;
  readingUnit?: string | null;
  simBaseline?: number | null;
  simAmplitude?: number | null;
  simNoise?: number | null;
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
  key: "ph" | "temp" | "do" | "level" | "flow";
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
}

// ── Generic error ───────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
  message: string;
}
