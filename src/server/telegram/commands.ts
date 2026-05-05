import type { Board, Task, TelegramAccount } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/db/audit";
import { createBoard, listBoardsForWorkspace } from "@/db/boards";
import { createCanvasItem } from "@/db/canvas-items";
import { listOpenTasksForWorkspace } from "@/db/tasks";
import { getActiveTelegramAccount } from "@/db/telegram";

export type TelegramCommandInput = {
  botConnectionId: string;
  telegramUserId: string;
  text: string;
};

export type TelegramCommandReply = {
  text: string;
};

type TelegramCommandDependencies = {
  getActiveTelegramAccount: (
    botConnectionId: string,
    telegramUserId: string,
  ) => Promise<TelegramAccount | null>;
  createBoard: (input: {
    workspaceId: string;
    title: string;
    createdBy: "user";
  }) => Promise<Board>;
  createCanvasItem: (input: {
    workspaceId: string;
    boardId: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: { text: string };
    createdBy: "user";
  }) => Promise<{ id: string }>;
  listBoardsForWorkspace: (workspaceId: string) => Promise<Board[]>;
  listOpenTasksForWorkspace: (workspaceId: string) => Promise<Task[]>;
  recordAuditEvent: (input: {
    workspaceId: string;
    actorType: "telegram";
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    metadata: { command: string };
  }) => Promise<unknown>;
};

const defaultDependencies: TelegramCommandDependencies = {
  createBoard,
  createCanvasItem,
  getActiveTelegramAccount,
  listBoardsForWorkspace,
  listOpenTasksForWorkspace,
  recordAuditEvent,
};

const UNLINKED_REPLY =
  "Link your account from the web app before using Telegram commands.";

export async function handleTelegramTextCommand(
  input: TelegramCommandInput,
  dependencies: TelegramCommandDependencies = defaultDependencies,
): Promise<TelegramCommandReply> {
  const command = parseTelegramCommand(input.text);

  if (
    command !== "/boards" &&
    command !== "/tasks" &&
    command !== "/newboard" &&
    command !== "/addnote"
  ) {
    return {
      text: "Unknown command. Try /boards, /tasks, /newboard <title>, or /addnote <board>: <note>.",
    };
  }

  const account = await dependencies.getActiveTelegramAccount(
    input.botConnectionId,
    input.telegramUserId,
  );

  if (!account) {
    return { text: UNLINKED_REPLY };
  }

  if (command === "/boards") {
    const boards = await dependencies.listBoardsForWorkspace(
      account.workspaceId,
    );

    return {
      text: formatBoardsReply(boards),
    };
  }

  if (command === "/newboard") {
    const title = parseCommandArgument(input.text);

    if (!title) {
      return { text: "Usage: /newboard <title>" };
    }

    const board = await dependencies.createBoard({
      createdBy: "user",
      title,
      workspaceId: account.workspaceId,
    });
    await dependencies.recordAuditEvent({
      action: "board.created",
      actorId: input.telegramUserId,
      actorType: "telegram",
      metadata: { command },
      summary: `Telegram created board: ${board.title}`,
      targetId: board.id,
      targetType: "Board",
      workspaceId: account.workspaceId,
    });

    return { text: `Created board: ${formatBoardTitle(board.title)}` };
  }

  if (command === "/addnote") {
    const noteInput = parseAddNoteArgument(input.text);

    if (!noteInput) {
      return { text: "Usage: /addnote <board>: <note>" };
    }

    const boards = await dependencies.listBoardsForWorkspace(
      account.workspaceId,
    );
    const board = findBoardByTitle(boards, noteInput.boardTitle);

    if (!board) {
      return { text: `Board not found: ${noteInput.boardTitle}` };
    }

    const item = await dependencies.createCanvasItem({
      boardId: board.id,
      content: { text: noteInput.note },
      createdBy: "user",
      height: 160,
      type: "sticky_note",
      width: 260,
      workspaceId: account.workspaceId,
      x: 0,
      y: 0,
    });
    await dependencies.recordAuditEvent({
      action: "canvas_item.created",
      actorId: input.telegramUserId,
      actorType: "telegram",
      metadata: { command },
      summary: `Telegram added note to board: ${board.title}`,
      targetId: item.id,
      targetType: "CanvasItem",
      workspaceId: account.workspaceId,
    });

    return { text: `Added note to ${formatBoardTitle(board.title)}.` };
  }

  const tasks = await dependencies.listOpenTasksForWorkspace(
    account.workspaceId,
  );

  return {
    text: formatTasksReply(tasks),
  };
}

export function parseCommandArgument(text: string): string {
  return text
    .trim()
    .replace(/^\S+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type AddNoteArgument = {
  boardTitle: string;
  note: string;
};

export function parseAddNoteArgument(text: string): AddNoteArgument | null {
  const argument = parseCommandArgument(text);
  const separatorIndex = argument.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  const boardTitle = argument.slice(0, separatorIndex).trim();
  const note = argument
    .slice(separatorIndex + 1)
    .replace(/\s+/g, " ")
    .trim();

  if (!boardTitle || !note) {
    return null;
  }

  return { boardTitle, note };
}

export function parseTelegramCommand(text: string): string {
  const [rawCommand = ""] = text.trim().split(/\s+/, 1);
  const command = rawCommand.split("@", 1)[0]?.toLowerCase() ?? "";

  return command;
}

export function formatBoardsReply(boards: Pick<Board, "title">[]): string {
  if (boards.length === 0) {
    return "No boards yet. Use /newboard <title> to create one.";
  }

  const visibleBoards = boards.slice(0, 10);
  const lines = visibleBoards.map(
    (board, index) => `${index + 1}. ${formatBoardTitle(board.title)}`,
  );
  const remaining = boards.length - visibleBoards.length;

  if (remaining > 0) {
    lines.push(`...and ${remaining} more.`);
  }

  return ["Recent boards:", ...lines].join("\n");
}

export function formatTasksReply(
  tasks: Pick<Task, "dueAt" | "priority" | "title">[],
): string {
  if (tasks.length === 0) {
    return "No open tasks.";
  }

  const visibleTasks = tasks.slice(0, 10);
  const lines = visibleTasks.map((task, index) => {
    const due = task.dueAt ? ` due ${formatTaskDueDate(task.dueAt)}` : "";
    const priority = task.priority === "normal" ? "" : ` [${task.priority}]`;

    return `${index + 1}. ${formatBoardTitle(task.title)}${priority}${due}`;
  });
  const remaining = tasks.length - visibleTasks.length;

  if (remaining > 0) {
    lines.push(`...and ${remaining} more.`);
  }

  return ["Open tasks:", ...lines].join("\n");
}

export function findBoardByTitle(
  boards: Pick<Board, "id" | "title">[],
  title: string,
): Pick<Board, "id" | "title"> | null {
  const normalizedTitle = normalizeBoardTitle(title);

  return (
    boards.find(
      (board) => normalizeBoardTitle(board.title) === normalizedTitle,
    ) ?? null
  );
}

function formatBoardTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim() || "Untitled board";
}

function normalizeBoardTitle(title: string): string {
  return formatBoardTitle(title).toLowerCase();
}

function formatTaskDueDate(dueAt: Date): string {
  return dueAt.toISOString().slice(0, 16).replace("T", " ");
}
