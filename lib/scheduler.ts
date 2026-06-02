// In-process cron engine.
// - Loads every enabled Schedule from the DB and registers a Cron job for it.
// - Re-syncs every 60s so create/update/delete via the API takes effect
//   without restarting the server.
// - When a job fires: creates a Notification + broadcasts a Web Push.
//
// This module guards against duplicate registration in dev (Next HMR /
// Turbopack can re-evaluate modules). Production-grade deployments with
// multiple Node instances should NOT rely on this — use external cron
// (Vercel Cron, system crontab, GitHub Actions) hitting an API route.

import { Cron } from "croner";

import { prisma } from "./prisma";
import { broadcastPush } from "./push";
import { syncSimulator } from "./simulator";

interface RegisteredJob {
  cron: Cron;
  expression: string;
  isEnabled: boolean;
  updatedAt: number;
}

const jobs = new Map<string, RegisteredJob>();
let resyncTimer: NodeJS.Timeout | null = null;
let started = false;

function fmtNext(c: Cron): Date | null {
  const next = c.nextRun();
  return next ?? null;
}

async function fireSchedule(scheduleId: string) {
  const s = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!s || !s.isEnabled) return;

  const notif = await prisma.notification.create({
    data: {
      scheduleId: s.id,
      title: s.name,
      body: s.description ?? `Schedule "${s.name}" triggered (${s.action})`,
    },
  });

  // bump nextRunAt + lastRunAt
  const cron = jobs.get(s.id)?.cron;
  await prisma.schedule.update({
    where: { id: s.id },
    data: {
      lastRunAt: new Date(),
      nextRunAt: cron ? fmtNext(cron) : null,
    },
  });

  // Fire-and-forget push fanout
  broadcastPush({
    title: s.name,
    body: notif.body,
    url: "/alerts",
    tag: `schedule-${s.id}`,
    notificationId: notif.id,
  }).catch((err) => console.error("[scheduler] push fanout failed:", err));

  console.log(`[scheduler] fired: ${s.name} (${s.id})`);
}

function registerOne(s: {
  id: string;
  name: string;
  cron: string;
  isEnabled: boolean;
  updatedAt: Date;
}) {
  try {
    const c = new Cron(s.cron, { protect: true }, () => fireSchedule(s.id));
    jobs.set(s.id, {
      cron: c,
      expression: s.cron,
      isEnabled: s.isEnabled,
      updatedAt: s.updatedAt.getTime(),
    });
    // Persist nextRunAt eagerly so UI shows it on first reload
    prisma.schedule
      .update({ where: { id: s.id }, data: { nextRunAt: fmtNext(c) } })
      .catch(() => {});
  } catch (err) {
    console.error(`[scheduler] invalid cron "${s.cron}" for ${s.name}:`, err);
  }
}

function unregister(id: string) {
  const job = jobs.get(id);
  if (job) {
    job.cron.stop();
    jobs.delete(id);
  }
}

async function resync() {
  const schedules = await prisma.schedule.findMany();
  const liveIds = new Set(schedules.map((s) => s.id));

  // Remove jobs whose schedules were deleted
  for (const id of jobs.keys()) {
    if (!liveIds.has(id)) unregister(id);
  }

  for (const s of schedules) {
    const existing = jobs.get(s.id);

    // Disabled — make sure it's stopped
    if (!s.isEnabled) {
      if (existing) unregister(s.id);
      continue;
    }

    // New or modified (cron expression changed, or row updated) — re-register
    const needsReplace =
      !existing ||
      existing.expression !== s.cron ||
      existing.updatedAt < s.updatedAt.getTime();

    if (needsReplace) {
      unregister(s.id);
      registerOne(s);
    }
  }

  // Also: deliver any snoozed notifications whose timer just elapsed.
  await releaseSnoozed();

  // And reconcile the simulator with the current data-source setting.
  await syncSimulator();
}

/**
 * When a snoozed notification's snoozeUntil falls into the past, "release"
 * it: clear the snoozeUntil, mark it unread, broadcast a push reminder.
 */
async function releaseSnoozed() {
  const due = await prisma.notification.findMany({
    where: {
      snoozeUntil: { lte: new Date() },
      isDismissed: false,
    },
  });
  if (!due.length) return;

  await prisma.notification.updateMany({
    where: { id: { in: due.map((n) => n.id) } },
    data: { snoozeUntil: null, isRead: false },
  });

  for (const n of due) {
    broadcastPush({
      title: `⏰ ${n.title}`,
      body: n.body,
      url: "/alerts",
      tag: `reminder-${n.id}`,
      notificationId: n.id,
    }).catch((err) =>
      console.error("[scheduler] snooze fanout failed:", err),
    );
  }
}

/**
 * Start the scheduler. Idempotent — multiple calls in the same process are no-ops.
 */
export async function startScheduler() {
  if (started) return;
  started = true;

  console.log("[scheduler] starting");
  await resync();
  resyncTimer = setInterval(() => {
    resync().catch((err) => console.error("[scheduler] resync error:", err));
  }, 60_000);

  // Allow graceful shutdown during dev reloads
  const stop = () => {
    if (resyncTimer) clearInterval(resyncTimer);
    for (const id of [...jobs.keys()]) unregister(id);
    started = false;
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
