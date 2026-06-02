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
  const token = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  // Once persistence has rehydrated and there's still no token → straight to login.
  useEffect(() => {
    if (hydrated && !token) router.replace("/login");
  }, [hydrated, token, router]);

  // Validate token against the server (handles revoked/expired sessions).
  const { isError, isLoading } = useQuery({
    enabled: hydrated && !!token,
    queryKey: ["me", token],
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

  if (!hydrated || !token || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F6F8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E4E7EC] border-t-[#2E7D32]" />
      </div>
    );
  }

  return <>{children}</>;
}
