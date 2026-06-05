// In-process rate limiter + brute-force lockout.
//
// Two layers protect the login endpoint:
//   1. A short-window IP throttle (token bucket) that caps overall request
//      volume — blunts naive credential-stuffing floods.
//   2. A per-email AND per-IP failure counter that triggers a temporary
//      lockout after N failed attempts. Successful logins reset both counters.
//
// State lives in-memory; this is correct for a single Node process. For a
// horizontally-scaled deployment, swap the Maps for Redis-backed counters.
// True DDoS protection lives at the CDN / WAF layer — this is the application
// floor, not the ceiling.

interface Bucket {
  tokens: number;
  updatedAt: number;
}
interface Failures {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

// Token-bucket per IP: 10 requests, refills 10 per 60 seconds.
const RPM_CAPACITY = 10;
const RPM_REFILL_PER_MS = RPM_CAPACITY / (60 * 1000);

// Lockout: 5 failures within 15 minutes locks the (ip,email) pair for 15 minutes.
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const ipBuckets = new Map<string, Bucket>();
const failures = new Map<string, Failures>();

// Opportunistic GC — drop stale rows on every check so memory stays bounded.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, v] of ipBuckets) {
    if (now - v.updatedAt > 5 * 60 * 1000) ipBuckets.delete(k);
  }
  for (const [k, v] of failures) {
    if (v.lockedUntil < now && now - v.firstAt > FAILURE_WINDOW_MS) {
      failures.delete(k);
    }
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  reason?: "ip_throttle" | "locked_out";
}

/**
 * Consume one token from the IP bucket and check the lockout state for
 * (ip,email). Call this BEFORE doing any expensive work.
 */
export function checkLoginRate(ip: string, email: string): RateLimitResult {
  const now = Date.now();
  sweep(now);

  // 1. Lockout check
  const key = `${ip}|${email.toLowerCase()}`;
  const f = failures.get(key);
  if (f && f.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((f.lockedUntil - now) / 1000),
      reason: "locked_out",
    };
  }

  // 2. IP throttle
  let b = ipBuckets.get(ip);
  if (!b) {
    b = { tokens: RPM_CAPACITY, updatedAt: now };
    ipBuckets.set(ip, b);
  } else {
    const refill = (now - b.updatedAt) * RPM_REFILL_PER_MS;
    b.tokens = Math.min(RPM_CAPACITY, b.tokens + refill);
    b.updatedAt = now;
  }
  if (b.tokens < 1) {
    const need = 1 - b.tokens;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(need / RPM_REFILL_PER_MS / 1000)),
      reason: "ip_throttle",
    };
  }
  b.tokens -= 1;

  return { ok: true, retryAfterSec: 0 };
}

/** Record a failed login. Triggers lockout when threshold is crossed. */
export function recordLoginFailure(ip: string, email: string): void {
  const now = Date.now();
  const key = `${ip}|${email.toLowerCase()}`;
  const existing = failures.get(key);
  if (!existing || now - existing.firstAt > FAILURE_WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  existing.count += 1;
  if (existing.count >= FAILURE_THRESHOLD) {
    existing.lockedUntil = now + LOCKOUT_MS;
  }
}

/** Reset the failure counter for this (ip,email). Call on successful login. */
export function resetLoginFailures(ip: string, email: string): void {
  failures.delete(`${ip}|${email.toLowerCase()}`);
}
