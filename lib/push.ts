import webpush from "web-push";

import { prisma } from "./prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@aquawatch.dev";
  if (!pub || !priv) {
    throw new Error(
      "VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.",
    );
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: string;
}

/**
 * Fan out a push to every stored subscription. Subscriptions that the push
 * service marks 404/410 (user revoked, browser uninstalled) are pruned.
 */
export async function broadcastPush(payload: PushPayload): Promise<{
  sent: number;
  pruned: number;
}> {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany();
  if (!subs.length) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const toPrune: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) toPrune.push(s.id);
        else console.error("[push] send failed:", status, (err as Error).message);
      }
    }),
  );

  if (toPrune.length) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: toPrune } },
    });
  }

  return { sent, pruned: toPrune.length };
}
