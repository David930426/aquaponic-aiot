"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { api } from "@/lib/axios";
import { messages } from "@/lib/i18n/messages";
import { useLocaleStore } from "@/store/useLocaleStore";
import type { DevicesResponse } from "@/types/api";

export function useDeviceToggle(zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch(`/api/devices/${id}`, { enabled }).then((r) => r.data),

    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["devices", zoneId] });
      const prev = queryClient.getQueryData<DevicesResponse>([
        "devices",
        zoneId,
      ]);
      if (prev) {
        queryClient.setQueryData<DevicesResponse>(["devices", zoneId], {
          ...prev,
          devices: prev.devices.map((d) =>
            d.id === id ? { ...d, isEnabled: enabled } : d,
          ),
        });
      }
      return { prev };
    },

    onError: (err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["devices", zoneId], context.prev);
      }
      const locale = useLocaleStore.getState().locale;
      const fallback = messages[locale]["devices.toggle.failed"];
      const message =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        fallback;
      toast.error(message);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["health-summary", zoneId] });
    },
  });
}
