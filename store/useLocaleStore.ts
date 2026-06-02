"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Locale } from "@/lib/i18n/messages";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "zh-TW",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "aquawatch-locale",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
