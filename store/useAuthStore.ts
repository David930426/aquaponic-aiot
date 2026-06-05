"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser } from "@/types/api";

// Auth source of truth is the httpOnly session cookie (set by /api/auth/login).
// We persist a copy of the user profile in localStorage purely so the topbar
// avatar/name can render before the /api/auth/me round-trip completes; the
// server still validates every request via the cookie.
interface AuthState {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "aquawatch-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state._setHydrated();
      },
    },
  ),
);
