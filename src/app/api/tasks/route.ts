import { NextResponse } from "next/server";

import { createTask, listOpenTasksForWorkspace } from "@/db/tasks";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tasks = await listOpenTasksForWorkspace(session.workspaceId);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: "low" | "normal" | "high";
    dueAt?: string;
    boardId?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const task = await createTask({
    boardId: body.boardId,
    createdBy: "user",
    description: body.description,
    dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    priority: body.priority,
    title: body.title.trim(),
    workspaceId: session.workspaceId,
  });

  return NextResponse.json({ task }, { status: 201 });
}
