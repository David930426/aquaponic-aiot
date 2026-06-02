"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/axios";

export interface NotificationItem {
  id: string;
  scheduleId: string | null;
  title: string;
  body: string;
  isRead: boolean;
  triggeredAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get<{ notifications: NotificationItem[] }>(
        "/api/notifications",
      );
      return data.notifications;
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Side-effect helper: when new notifications appear in the polled feed,
 * surface them as an in-app toast (in addition to any Web Push that the
 * service worker may render at the OS level).
 */
export function useNewNotificationToasts(items: NotificationItem[] | undefined) {
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (!items) return;
    // First poll: just record what's already there; don't toast historical items.
    if (!primed.current) {
      for (const n of items) seen.current.add(n.id);
      primed.current = true;
      return;
    }
    for (const n of items) {
      if (!seen.current.has(n.id)) {
        seen.current.add(n.id);
        toast(n.title, { description: n.body, duration: 6000 });
      }
    }
  }, [items]);
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/notifications/${id}/dismiss`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useSnoozeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      api
        .post(`/api/notifications/${id}/snooze`, { minutes })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
