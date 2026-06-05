import axios from "axios";

import { useAuthStore } from "@/store/useAuthStore";

const baseURL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
    : "";

// withCredentials ensures the browser sends our httpOnly session cookie.
// There's no Authorization header in client requests anymore — JS can't read
// the cookie, which protects the token from XSS exfiltration.
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (typeof window === "undefined") return Promise.reject(error);
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    if (status === 401 && !url.includes("/api/auth/login")) {
      const path = window.location.pathname;
      // Avoid clobbering an already-in-progress redirect
      useAuthStore.getState().logout();
      if (path !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
