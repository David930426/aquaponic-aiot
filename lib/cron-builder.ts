// Helpers to convert between a friendly structured schedule spec and a
// 5-field cron expression. Used by the schedule create/edit dialog so users
// never have to think about cron syntax directly.
//
// Supported kinds:
//   • everyMinutes — */N * * * *   (N in 1..59)
//   • hourly       — M * * * *     (M in 0..59, run once per hour at minute M)
//   • daily        — M H * * *     (H in 0..23, M in 0..59)
//   • weekly       — M H * * D…    (D in 0..6, 0 = Sun, comma-separated)
//   • monthly      — M H D * *     (D in 1..31)
//   • custom       — anything else; the raw cron passes through unchanged

import cronstrue from "cronstrue";
import "cronstrue/locales/zh_TW";

export type ScheduleKind =
  | "everyMinutes"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export interface ScheduleSpec {
  kind: ScheduleKind;
  /** 0-59 — used by everyMinutes, hourly (minute-within-the-hour), daily, weekly, monthly */
  minute: number;
  /** 0-23 — used by daily, weekly, monthly */
  hour: number;
  /** 0-6, 0 = Sunday — used by weekly */
  weekdays: number[];
  /** 1-31 — used by monthly */
  dayOfMonth: number;
  /** 1-59 — used by everyMinutes */
  everyMinutes: number;
  /** raw cron when kind === "custom" */
  custom: string;
}

export const DEFAULT_SPEC: ScheduleSpec = {
  kind: "daily",
  minute: 0,
  hour: 8,
  weekdays: [1, 2, 3, 4, 5],
  dayOfMonth: 1,
  everyMinutes: 5,
  custom: "0 8 * * *",
};

const MIN = (n: number) => Math.max(0, Math.min(59, Math.floor(n)));
const HOUR = (n: number) => Math.max(0, Math.min(23, Math.floor(n)));
const DOM = (n: number) => Math.max(1, Math.min(31, Math.floor(n)));

export function buildCron(s: ScheduleSpec): string {
  switch (s.kind) {
    case "everyMinutes": {
      const n = Math.max(1, Math.min(59, Math.floor(s.everyMinutes)));
      return `*/${n} * * * *`;
    }
    case "hourly":
      return `${MIN(s.minute)} * * * *`;
    case "daily":
      return `${MIN(s.minute)} ${HOUR(s.hour)} * * *`;
    case "weekly": {
      const days = [...new Set(s.weekdays)]
        .filter((d) => d >= 0 && d <= 6)
        .sort((a, b) => a - b);
      if (!days.length) return `${MIN(s.minute)} ${HOUR(s.hour)} * * *`;
      return `${MIN(s.minute)} ${HOUR(s.hour)} * * ${days.join(",")}`;
    }
    case "monthly":
      return `${MIN(s.minute)} ${HOUR(s.hour)} ${DOM(s.dayOfMonth)} * *`;
    case "custom":
    default:
      return s.custom.trim();
  }
}

/**
 * Try to recognize a cron expression as one of the friendly kinds.
 * Returns a spec that matches if possible, otherwise `kind: "custom"`.
 */
export function parseCron(cron: string): ScheduleSpec {
  const spec: ScheduleSpec = { ...DEFAULT_SPEC, custom: cron };
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { ...spec, kind: "custom" };

  const [m, h, dom, mon, dow] = parts;
  const isInt = (s: string) => /^\d+$/.test(s);
  const onlyStar = (s: string) => s === "*";

  // every N minutes: */N * * * *
  const everyMatch = /^\*\/(\d+)$/.exec(m);
  if (
    everyMatch &&
    onlyStar(h) &&
    onlyStar(dom) &&
    onlyStar(mon) &&
    onlyStar(dow)
  ) {
    const n = Number(everyMatch[1]);
    if (n >= 1 && n <= 59) {
      return { ...spec, kind: "everyMinutes", everyMinutes: n };
    }
  }

  // need integer minute for the next kinds
  if (!isInt(m)) return { ...spec, kind: "custom" };
  const minute = Number(m);

  // hourly: M * * * *
  if (onlyStar(h) && onlyStar(dom) && onlyStar(mon) && onlyStar(dow)) {
    return { ...spec, kind: "hourly", minute };
  }

  if (!isInt(h)) return { ...spec, kind: "custom" };
  const hour = Number(h);

  // daily: M H * * *
  if (onlyStar(dom) && onlyStar(mon) && onlyStar(dow)) {
    return { ...spec, kind: "daily", minute, hour };
  }

  // weekly: M H * * D[,D…]
  if (onlyStar(dom) && onlyStar(mon) && /^[0-6](,[0-6])*$/.test(dow)) {
    const weekdays = [...new Set(dow.split(",").map(Number))].sort(
      (a, b) => a - b,
    );
    return { ...spec, kind: "weekly", minute, hour, weekdays };
  }

  // monthly: M H D * *
  if (isInt(dom) && onlyStar(mon) && onlyStar(dow)) {
    const d = Number(dom);
    if (d >= 1 && d <= 31) {
      return { ...spec, kind: "monthly", minute, hour, dayOfMonth: d };
    }
  }

  return { ...spec, kind: "custom" };
}

/** Human-readable description of a cron expression in the requested locale. */
export function humanizeCron(cron: string, locale: "en" | "zh-TW"): string {
  try {
    return cronstrue.toString(cron, {
      locale: locale === "zh-TW" ? "zh_TW" : "en",
      verbose: false,
      use24HourTimeFormat: true,
    });
  } catch {
    return cron;
  }
}
