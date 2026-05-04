import { getPrismaClient } from "./client";

const db = getPrismaClient();

export async function getOrCreateThreadForBoard(
  workspaceId: string,
  boardId: string | null,
) {
  const existing = await db.chatThread.findFirst({
    where: { workspaceId, boardId: boardId ?? null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return db.chatThread.create({
    data: { workspaceId, boardId: boardId ?? null },
  });
}

export async function listMessagesForThread(threadId: string) {
  return db.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });
}

export async function appendMessages(
  threadId: string,
  messages: {
    role: string;
    content: string;
    toolName?: string;
    toolStatus?: string;
  }[],
) {
  if (!messages.length) return;
  return db.chatMessage.createMany({
    data: messages.map((m) => ({ ...m, threadId })),
  });
}
