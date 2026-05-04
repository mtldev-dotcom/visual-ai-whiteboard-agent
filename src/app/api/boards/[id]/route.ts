import { NextResponse } from "next/server";

import { archiveBoard, getBoardById, updateBoard } from "@/db/boards";
import { listCanvasItemsForBoard } from "@/db/canvas-items";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const canvasItems = await listCanvasItemsForBoard(id);
  return NextResponse.json({ board, canvasItems });
}

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
  };
  const updated = await updateBoard({
    boardId: id,
    title: body.title,
    description: body.description,
  });
  return NextResponse.json({ board: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  await archiveBoard(id);
  return NextResponse.json({ ok: true });
}
