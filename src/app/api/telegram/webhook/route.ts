import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: "Telegram webhooks must use a bot-specific endpoint.",
  });
}
