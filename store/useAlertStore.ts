"use client";

import { create } from "zustand";

import type { AlertState } from "./types";

export const useAlertStore = create<AlertState>((set) => ({
  isSheetOpen: false,
  openSheet: () => set({ isSheetOpen: true }),
  closeSheet: () => set({ isSheetOpen: false }),
  toggleSheet: () => set((s) => ({ isSheetOpen: !s.isSheetOpen })),
}));
