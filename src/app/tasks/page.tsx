import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { listBoardsForWorkspace } from "@/db/boards";
import { listOpenTasksForWorkspace } from "@/db/tasks";
import { authOptions } from "@/lib/auth";

import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const [tasks, boards] = await Promise.all([
    listOpenTasksForWorkspace(session.user.workspaceId),
    listBoardsForWorkspace(session.user.workspaceId),
  ]);

  return (
    <TasksClient
      initialTasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueAt: t.dueAt?.toISOString() ?? null,
        boardId: t.boardId ?? null,
      }))}
      boards={boards.map((b) => ({ id: b.id, title: b.title }))}
    />
  );
}
