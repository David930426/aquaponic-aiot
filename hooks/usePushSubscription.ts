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

export function usePushSubscription(): UsePushSubscriptionResult {
  const [status, setStatus] = useState<Status>("default");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = (await reg?.pushManager.getSubscription()) ?? null;
      if (sub && Notification.permission === "granted") {
        setStatus("subscribed");
      } else {
        setStatus("default");
      }
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
