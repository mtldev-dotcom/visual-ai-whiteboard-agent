import { NextResponse } from "next/server";

import { createTelegramLinkTokenRecord } from "@/db/telegram";
import { requireSession } from "@/lib/session";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const issued = await createTelegramLinkTokenRecord({
    ownerUserId: session.userId,
    workspaceId: session.workspaceId,
  });

  return NextResponse.json({
    token: issued.token,
    expiresAt: issued.expiresAt.toISOString(),
  });
}
