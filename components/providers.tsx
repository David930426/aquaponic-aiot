"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { LOCALE_COOKIE } from "@/lib/i18n/cookie";
import { makeQueryClient } from "@/lib/queryClient";
import { useLocaleStore } from "@/store/useLocaleStore";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh-TW" ? "zh-Hant" : "en";
    // Persist locale to a cookie so server-rendered layouts (e.g. generateMetadata)
    // can render the right document <title> without a flash of the wrong language.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  // Register the service worker for Web Push. Idempotent — once registered it
  // sticks around even if the user later disables notifications.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ className: "text-sm" }}
      />
    </QueryClientProvider>
  );
}
