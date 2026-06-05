import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-constants";

// Server-side route gating (Next 16 "proxy", formerly middleware).
//
// This file runs on the Edge runtime, so it CANNOT import lib/auth.ts
// (node:crypto + prisma). It only does a presence check on the session
// cookie; real session validation (token hash lookup, expiry, revocation)
// happens in API route handlers via getSessionUser(). A stale cookie that
// survives this check just means the next API call returns 401 and the
// client-side AuthGuard logs out + redirects.
//
// The matcher excludes /api, static assets, and Next internals so the proxy
// only runs on actual page navigations.

const PUBLIC_PATHS = new Set<string>(["/login"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

// Anti-open-redirect: only follow `next` when it's a local path. Reject
// anything that could be parsed as an absolute URL (//evil.com, http://…)
// or that would re-loop back to /login.
function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/login")) return null;
  return next;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // Already-authenticated users hitting /login → bounce to dashboard
  // (or to ?next= if it was preserved across the round-trip).
  if (isPublicPath(pathname) && hasSession) {
    const next = safeNext(req.nextUrl.searchParams.get("next"));
    const dest = req.nextUrl.clone();
    dest.pathname = next ?? "/dashboard";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  // Unauthenticated visitor on any non-public page → /login?next=<here>
  if (!isPublicPath(pathname) && !hasSession) {
    const dest = req.nextUrl.clone();
    dest.pathname = "/login";
    const original = pathname + search;
    dest.search =
      original === "/" || original === "/dashboard"
        ? ""
        : `?next=${encodeURIComponent(original)}`;
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

// Run on all browser-navigable paths; skip API, Next internals, and assets.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|woff2?|ttf)).*)",
  ],
};
