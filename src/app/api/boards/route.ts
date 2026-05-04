import { NextResponse } from "next/server";

import {
  createBoard,
  createSubBoard,
  listBoardsForWorkspace,
  searchBoardsForWorkspace,
} from "@/db/boards";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const boards = q
    ? await searchBoardsForWorkspace(session.workspaceId, q)
    : await listBoardsForWorkspace(session.workspaceId);

  return NextResponse.json({ boards });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    parentBoardId?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const board = body.parentBoardId
    ? await createSubBoard({
        createdBy: "user",
        description: body.description,
        parentBoardId: body.parentBoardId,
        title: body.title.trim(),
        workspaceId: session.workspaceId,
      })
    : await createBoard({
        createdBy: "user",
        description: body.description,
        title: body.title.trim(),
        workspaceId: session.workspaceId,
      });

  return NextResponse.json({ board }, { status: 201 });
}
