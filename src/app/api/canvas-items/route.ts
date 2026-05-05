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
  "rich_text",
  "reminders",
  "board_link",
  "section",
  "kanban",
  "drawing",
  "arrow",
  "shape",
  "frame",
  "notes",
];

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

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

  let content = body.content ?? {};
  if (body.type === "board_link") {
    if (!isObject(content) || typeof content.targetBoardId !== "string") {
      return NextResponse.json(
        { error: "board_link content.targetBoardId is required." },
        { status: 400 },
      );
    }

    const targetBoard = await getBoardById(content.targetBoardId);
    if (!targetBoard || targetBoard.workspaceId !== session.workspaceId) {
      return NextResponse.json(
        { error: "Target board not found." },
        { status: 404 },
      );
    }

    content = {
      ...content,
      targetBoardId: targetBoard.id,
      title:
        typeof content.title === "string" && content.title.trim()
          ? content.title
          : targetBoard.title,
    };
  }

  const item = await createCanvasItem({
    boardId: body.boardId,
    content: content as Prisma.InputJsonValue,
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
