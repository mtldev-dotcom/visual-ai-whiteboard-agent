import { NextResponse } from "next/server";

import { getBoardById } from "@/db/boards";
import { createCanvasItem } from "@/db/canvas-items";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";

const VALID_TYPES = [
  "text",
  "sticky_note",
  "markdown",
  "image",
  "link",
  "iframe_embed",
  "html_widget",
  "task_list",
  "board_link",
  "section",
  "kanban",
  "drawing",
  "arrow",
  "shape",
  "frame",
  "notes",
];

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    boardId?: string;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: Record<string, unknown>;
  };

  if (!body.boardId) {
    return NextResponse.json(
      { error: "boardId is required." },
      { status: 400 },
    );
  }

  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }

  const board = await getBoardById(body.boardId);
  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const item = await createCanvasItem({
    boardId: body.boardId,
    content: (body.content ?? {}) as Prisma.InputJsonValue,
    createdBy: "user",
    height: body.height ?? 160,
    type: body.type,
    width: body.width ?? 260,
    workspaceId: session.workspaceId,
    x: body.x ?? 32,
    y: body.y ?? 32,
  });

  return NextResponse.json({ item }, { status: 201 });
}
