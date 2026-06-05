"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import type { AuthUser } from "@/types/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const cachedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  // Cookie isn't readable from JS, so we ask the server who we are.
  // Cached `user` only seeds initial render — the source of truth is /me.
  const { isError, isLoading, isFetched } = useQuery({
    enabled: hydrated,
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
      setUser(data.user);
      return data.user;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      logout();
      router.replace("/login");
    }
  }, [isError, logout, router]);

  const stillCheckingFirstTime = isLoading && !isFetched && !cachedUser;
  if (!hydrated || stillCheckingFirstTime) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F6F8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E7EC] border-t-[#2E7D32]" />
      </div>
    );
  }

  return <>{children}</>;
}
