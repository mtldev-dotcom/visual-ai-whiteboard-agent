import { NextResponse } from "next/server";

import { listBoardsForWorkspace } from "@/db/boards";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const boards = await listBoardsForWorkspace(session.workspaceId);

  return NextResponse.json({
    workspaceId: session.workspaceId,
    userId: session.userId,
    boardCount: boards.length,
  });
}
