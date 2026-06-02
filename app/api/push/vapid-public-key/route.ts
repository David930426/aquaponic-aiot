import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "NOT_CONFIGURED",
        message: "Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ publicKey: key });
}
