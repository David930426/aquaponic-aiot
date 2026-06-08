"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { api } from "@/lib/axios";
import { messages } from "@/lib/i18n/messages";
import { useLocaleStore } from "@/store/useLocaleStore";
import type { Device, DeviceInput } from "@/types/api";

function errMessage(err: unknown, fallback: string): string {
  return (
    (axios.isAxiosError(err) &&
      (err.response?.data as { message?: string } | undefined)?.message) ||
    fallback
  );
}

// Plain (non-hook) message lookup — safe to call inside mutation callbacks.
// Reads the locale imperatively from the Zustand store at call time.
function msg(key: keyof (typeof messages)["en"]): string {
  const locale = useLocaleStore.getState().locale;
  return messages[locale][key];
}

/** Create / edit / delete devices. Invalidates the zone's device list. */
export function useDeviceMutations(zoneId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["devices", zoneId] });
    queryClient.invalidateQueries({ queryKey: ["health-summary", zoneId] });
  };

  const create = useMutation({
    mutationFn: (input: DeviceInput) =>
      api
        .post<{ device: Device }>("/api/devices", { ...input, zoneId })
        .then((r) => r.data.device),
    onSuccess: () => {
      toast.success(msg("devices.form.created"));
      invalidate();
    },
    onError: (err) =>
      toast.error(errMessage(err, msg("devices.form.saveFailed"))),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DeviceInput> }) =>
      api
        .patch<{ device: Device }>(`/api/devices/${id}`, input)
        .then((r) => r.data.device),
    onSuccess: () => {
      toast.success(msg("devices.form.updated"));
      invalidate();
    },
    onError: (err) =>
      toast.error(errMessage(err, msg("devices.form.saveFailed"))),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/devices/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success(msg("devices.form.deleted"));
      invalidate();
    },
    onError: (err) =>
      toast.error(errMessage(err, msg("devices.form.deleteFailed"))),
  });

  return { create, update, remove };
}
