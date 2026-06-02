"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { ZoneState } from "./types";

export const useZoneStore = create<ZoneState>()(
  persist(
    (set) => ({
      selectedZoneId: "zone-001",
      setSelectedZoneId: (selectedZoneId) => set({ selectedZoneId }),
    }),
    {
      name: "aquawatch-zone",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
