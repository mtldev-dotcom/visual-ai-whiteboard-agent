import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const prisma = getPrismaClient();

  const task = await prisma.task.findFirst({
    where: { id, workspaceId: session.workspaceId },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    status?: string;
    title?: string;
    priority?: string;
    dueAt?: string | null;
  };

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: body.status,
      title: body.title,
      priority: body.priority,
      dueAt:
        body.dueAt === null
          ? null
          : body.dueAt
            ? new Date(body.dueAt)
            : undefined,
      completedAt: body.status === "completed" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ task: updated });
}
