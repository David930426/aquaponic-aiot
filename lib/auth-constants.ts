// Edge-safe auth constants. Kept separate from lib/auth.ts so the proxy
// (Edge runtime) can import the cookie name without pulling in node:crypto,
// prisma, or anything else that fails to compile on the Edge.

export const SESSION_COOKIE = "aquawatch_session";
