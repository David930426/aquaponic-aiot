"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/axios";

type Status =
  | "unsupported"
  | "blocked"
  | "default" // user hasn't decided yet
  | "subscribed";

interface UsePushSubscriptionResult {
  status: Status;
  isWorking: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Synchronous best-guess at the current push status from browser APIs alone.
// "subscribed" requires an async check against PushManager, so we settle for
// "default" initially and let the mount effect upgrade it.
function getInitialStatus(): Status {
  if (typeof window === "undefined") return "default";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  return "default";
}

export function usePushSubscription(): UsePushSubscriptionResult {
  // Lazy initializer runs once during the first render — no effect needed
  // for the synchronous portion of the status check.
  const [status, setStatus] = useState<Status>(getInitialStatus);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to the actual PushManager state. Only relevant when the
  // browser supports it AND the user hasn't blocked notifications. Inside
  // the listener we can call setStatus freely — the lint rule only objects
  // to *synchronous* setState inside the effect body itself.
  useEffect(() => {
    if (status === "unsupported" || status === "blocked") return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = (await reg?.pushManager.getSubscription()) ?? null;
        if (cancelled) return;
        if (sub && Notification.permission === "granted") {
          setStatus("subscribed");
        } else {
          setStatus("default");
        }
      } catch {
        if (!cancelled) setStatus("default");
      }
    };
    void check();

    // If the page comes back into focus, re-verify in case the user changed
    // their browser permission in another tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  const subscribe = useCallback(async () => {
    setError(null);
    setIsWorking(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications are not supported in this browser");
      }

      // 1. Register the service worker (root scope)
      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;

      // 2. Ask the user
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setStatus("blocked");
        throw new Error("Permission denied");
      }

      // 3. Fetch the VAPID public key
      const { data: vapid } = await api.get<{ publicKey: string }>(
        "/api/push/vapid-public-key",
      );

      // 4. Subscribe with the push service.
      // (Cast: PushManager.subscribe expects BufferSource but TS narrows
      // Uint8Array<ArrayBufferLike> too aggressively here.)
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          vapid.publicKey,
        ) as unknown as BufferSource,
      });

      // 5. Send the subscription to our backend
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Subscription returned without keys");
      }
      await api.post("/api/push/subscribe", {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
      });

      setStatus("subscribed");
    } catch (e) {
      setError((e as Error).message || "Failed to enable notifications");
    } finally {
      setIsWorking(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsWorking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api
          .post("/api/push/unsubscribe", { endpoint: sub.endpoint })
          .catch(() => {});
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch (e) {
      setError((e as Error).message || "Failed to disable notifications");
    } finally {
      setIsWorking(false);
    }
  }, []);

  return { status, isWorking, error, subscribe, unsubscribe };
}
