import { NextResponse } from "next/server";

import { getOrCreateThreadForBoard, listMessagesForThread } from "@/db/chat";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId") ?? null;

  const thread = await getOrCreateThreadForBoard(session.workspaceId, boardId);
  const messages = await listMessagesForThread(thread.id);

  return NextResponse.json({ threadId: thread.id, messages });
}
