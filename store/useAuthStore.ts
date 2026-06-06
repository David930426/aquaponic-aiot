"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser } from "@/types/api";

// Auth source of truth is the httpOnly session cookie (set by /api/auth/login).
// We persist a copy of the user profile in localStorage purely so the topbar
// avatar/name can render before the /api/auth/me round-trip completes; the
// server still validates every request via the cookie.
//
// `avatarVersion` is a cache-busting timestamp bumped on avatar upload /
// removal so the topbar avatar updates immediately without waiting for the
// CDN/proxy cache to expire.
interface AuthState {
  user: AuthUser | null;
  avatarVersion: number;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  bumpAvatarVersion: () => void;
  logout: () => void;
  _setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      avatarVersion: 0,
      hydrated: false,
      setUser: (user) => set({ user }),
      bumpAvatarVersion: () => set({ avatarVersion: Date.now() }),
      logout: () => set({ user: null, avatarVersion: 0 }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "aquawatch-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, avatarVersion: s.avatarVersion }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state._setHydrated();
      },
    },
  ),
);
