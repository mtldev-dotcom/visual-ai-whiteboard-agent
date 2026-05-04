import { describe, expect, it } from "vitest";

import type { Board, Task, TelegramAccount } from "@/generated/prisma/client";

import {
  findBoardByTitle,
  formatBoardsReply,
  formatTasksReply,
  handleTelegramTextCommand,
  parseAddNoteArgument,
  parseCommandArgument,
  parseTelegramCommand,
} from "./commands";

const linkedAccount = {
  firstName: "Ada",
  id: "telegram-account-1",
  lastName: null,
  linkedAt: new Date("2026-05-03T12:00:00.000Z"),
  ownerUserId: "user-1",
  telegramUserId: "123",
  unlinkedAt: null,
  updatedAt: new Date("2026-05-03T12:00:00.000Z"),
  username: "ada",
  workspaceId: "workspace-1",
} satisfies TelegramAccount;

function createBoard(title: string): Board {
  return {
    archivedAt: null,
    createdAt: new Date("2026-05-03T12:00:00.000Z"),
    createdBy: "user",
    description: null,
    id: `board-${title}`,
    parentBoardId: null,
    title,
    updatedAt: new Date("2026-05-03T12:00:00.000Z"),
    workspaceId: "workspace-1",
  };
}

function createTask(title: string, input: Partial<Task> = {}): Task {
  return {
    boardId: null,
    canvasItemId: null,
    completedAt: null,
    createdAt: new Date("2026-05-03T12:00:00.000Z"),
    createdBy: "user",
    description: null,
    dueAt: null,
    id: `task-${title}`,
    priority: "normal",
    status: "open",
    title,
    updatedAt: new Date("2026-05-03T12:00:00.000Z"),
    workspaceId: "workspace-1",
    ...input,
  };
}

const baseDependencies = {
  createBoard: async () => createBoard("Created"),
  createCanvasItem: async () => ({ id: "item-1" }),
  getActiveTelegramAccount: async () => linkedAccount,
  listBoardsForWorkspace: async () => [],
  listOpenTasksForWorkspace: async () => [],
  recordAuditEvent: async () => ({}),
};

describe("Telegram command parsing", () => {
  it("parses bot-addressed commands case-insensitively", () => {
    expect(parseTelegramCommand(" /Boards@VisualBot extra text ")).toBe(
      "/boards",
    );
  });

  it("parses command arguments", () => {
    expect(parseCommandArgument("/newboard   Launch   Plan ")).toBe(
      "Launch Plan",
    );
  });

  it("parses add-note arguments", () => {
    expect(parseAddNoteArgument("/addnote Ideas:   Build the thing ")).toEqual({
      boardTitle: "Ideas",
      note: "Build the thing",
    });
  });
});

describe("handleTelegramTextCommand", () => {
  it("rejects unlinked users before listing boards", async () => {
    let listedBoards = false;

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/boards" },
        {
          ...baseDependencies,
          getActiveTelegramAccount: async () => null,
          listBoardsForWorkspace: async () => {
            listedBoards = true;
            return [];
          },
          listOpenTasksForWorkspace: async () => [],
        },
      ),
    ).resolves.toEqual({
      text: "Link your account from the web app before using Telegram commands.",
    });
    expect(listedBoards).toBe(false);
  });

  it("lists recent boards for linked users", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/boards" },
        {
          ...baseDependencies,
          getActiveTelegramAccount: async () => linkedAccount,
          listBoardsForWorkspace: async (workspaceId) => {
            expect(workspaceId).toBe("workspace-1");
            return [createBoard("Launch"), createBoard("Ideas")];
          },
        },
      ),
    ).resolves.toEqual({
      text: "Recent boards:\n1. Launch\n2. Ideas",
    });
  });

  it("returns an empty-state reply when no boards exist", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/boards" },
        {
          ...baseDependencies,
          listBoardsForWorkspace: async () => [],
        },
      ),
    ).resolves.toEqual({
      text: "No boards yet. Use /newboard <title> to create one.",
    });
  });
});

describe("handleTelegramTextCommand /tasks", () => {
  it("rejects unlinked users before listing tasks", async () => {
    let listedTasks = false;

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/tasks" },
        {
          ...baseDependencies,
          getActiveTelegramAccount: async () => null,
          listOpenTasksForWorkspace: async () => {
            listedTasks = true;
            return [];
          },
        },
      ),
    ).resolves.toEqual({
      text: "Link your account from the web app before using Telegram commands.",
    });
    expect(listedTasks).toBe(false);
  });

  it("lists open tasks for linked users", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/tasks" },
        {
          ...baseDependencies,
          listOpenTasksForWorkspace: async (workspaceId) => {
            expect(workspaceId).toBe("workspace-1");
            return [
              createTask("Review launch", {
                dueAt: new Date("2026-05-04T09:30:00.000Z"),
                priority: "high",
              }),
              createTask("Clean notes"),
            ];
          },
        },
      ),
    ).resolves.toEqual({
      text: "Open tasks:\n1. Review launch [high] due 2026-05-04 09:30\n2. Clean notes",
    });
  });

  it("returns an empty-state reply when no open tasks exist", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/tasks" },
        baseDependencies,
      ),
    ).resolves.toEqual({
      text: "No open tasks.",
    });
  });
});

describe("handleTelegramTextCommand /newboard", () => {
  it("rejects unlinked users before creating boards", async () => {
    let createdBoard = false;

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/newboard Launch" },
        {
          ...baseDependencies,
          createBoard: async () => {
            createdBoard = true;
            return createBoard("Launch");
          },
          getActiveTelegramAccount: async () => null,
        },
      ),
    ).resolves.toEqual({
      text: "Link your account from the web app before using Telegram commands.",
    });
    expect(createdBoard).toBe(false);
  });

  it("returns usage when title is missing", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/newboard" },
        baseDependencies,
      ),
    ).resolves.toEqual({
      text: "Usage: /newboard <title>",
    });
  });

  it("creates a board and records an audit event", async () => {
    const auditEvents: unknown[] = [];

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/newboard Launch Plan" },
        {
          ...baseDependencies,
          createBoard: async (input) => {
            expect(input).toEqual({
              createdBy: "user",
              title: "Launch Plan",
              workspaceId: "workspace-1",
            });

            return createBoard("Launch Plan");
          },
          recordAuditEvent: async (input) => {
            auditEvents.push(input);
            return {};
          },
        },
      ),
    ).resolves.toEqual({
      text: "Created board: Launch Plan",
    });
    expect(auditEvents).toEqual([
      {
        action: "board.created",
        actorId: "123",
        actorType: "telegram",
        metadata: { command: "/newboard" },
        summary: "Telegram created board: Launch Plan",
        targetId: "board-Launch Plan",
        targetType: "Board",
        workspaceId: "workspace-1",
      },
    ]);
  });
});

describe("handleTelegramTextCommand /addnote", () => {
  it("rejects unlinked users before creating notes", async () => {
    let createdItem = false;

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/addnote Ideas: Build" },
        {
          ...baseDependencies,
          createCanvasItem: async () => {
            createdItem = true;
            return { id: "item-1" };
          },
          getActiveTelegramAccount: async () => null,
        },
      ),
    ).resolves.toEqual({
      text: "Link your account from the web app before using Telegram commands.",
    });
    expect(createdItem).toBe(false);
  });

  it("returns usage when board title or note is missing", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/addnote Ideas" },
        baseDependencies,
      ),
    ).resolves.toEqual({
      text: "Usage: /addnote <board>: <note>",
    });
  });

  it("returns not found when the target board does not exist", async () => {
    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/addnote Missing: Build" },
        {
          ...baseDependencies,
          listBoardsForWorkspace: async () => [createBoard("Ideas")],
        },
      ),
    ).resolves.toEqual({
      text: "Board not found: Missing",
    });
  });

  it("adds a sticky note and records an audit event", async () => {
    const auditEvents: unknown[] = [];

    await expect(
      handleTelegramTextCommand(
        { telegramUserId: "123", text: "/addnote Ideas: Build mobile flow" },
        {
          ...baseDependencies,
          createCanvasItem: async (input) => {
            expect(input).toEqual({
              boardId: "board-Ideas",
              content: { text: "Build mobile flow" },
              createdBy: "user",
              height: 160,
              type: "sticky_note",
              width: 260,
              workspaceId: "workspace-1",
              x: 0,
              y: 0,
            });

            return { id: "item-1" };
          },
          listBoardsForWorkspace: async () => [createBoard("Ideas")],
          recordAuditEvent: async (input) => {
            auditEvents.push(input);
            return {};
          },
        },
      ),
    ).resolves.toEqual({
      text: "Added note to Ideas.",
    });
    expect(auditEvents).toEqual([
      {
        action: "canvas_item.created",
        actorId: "123",
        actorType: "telegram",
        metadata: { command: "/addnote" },
        summary: "Telegram added note to board: Ideas",
        targetId: "item-1",
        targetType: "CanvasItem",
        workspaceId: "workspace-1",
      },
    ]);
  });
});

describe("formatBoardsReply", () => {
  it("limits long board lists", () => {
    const boards = Array.from({ length: 12 }, (_, index) =>
      createBoard(`Board ${index + 1}`),
    );

    expect(formatBoardsReply(boards)).toContain("...and 2 more.");
  });
});

describe("findBoardByTitle", () => {
  it("matches titles case-insensitively", () => {
    expect(findBoardByTitle([createBoard("Ideas")], " ideas ")?.id).toBe(
      "board-Ideas",
    );
  });
});

describe("formatTasksReply", () => {
  it("limits long task lists", () => {
    const tasks = Array.from({ length: 12 }, (_, index) =>
      createTask(`Task ${index + 1}`),
    );

    expect(formatTasksReply(tasks)).toContain("...and 2 more.");
  });
});
