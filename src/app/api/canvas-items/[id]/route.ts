import { NextResponse } from "next/server";

import {
  getCanvasItemById,
  softDeleteCanvasItem,
  updateCanvasItem,
} from "@/db/canvas-items";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const item = await getCanvasItemById(id);

  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: Record<string, unknown>;
  };

  const updated = await updateCanvasItem({
    itemId: id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    content: body.content as Prisma.InputJsonValue | undefined,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const item = await getCanvasItemById(id);

  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  await softDeleteCanvasItem(id);
  return NextResponse.json({ ok: true });
}
