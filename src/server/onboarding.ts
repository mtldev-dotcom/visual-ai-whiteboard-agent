import { createBoard } from "../db/boards";
import { createCanvasItem } from "../db/canvas-items";
import type { Prisma } from "@/generated/prisma/client";

export async function seedOnboardingBoard(workspaceId: string) {
  const board = await createBoard({
    createdBy: "system",
    description: "Your starting point — edit, add, or ask the AI to help.",
    title: "Welcome Board",
    workspaceId,
  });

  const items: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: Prisma.InputJsonObject;
  }[] = [
    {
      type: "sticky_note",
      x: 60,
      y: 60,
      width: 220,
      height: 180,
      content: {
        title: "Welcome 👋",
        text: "This is your Visual AI Whiteboard.\n\nDrag items, zoom with Ctrl+scroll, and ask the AI assistant anything.",
      },
    },
    {
      type: "sticky_note",
      x: 320,
      y: 60,
      width: 260,
      height: 160,
      content: {
        title: "Quick Notes",
        text: "Jot things down here. The AI can read and update these.",
      },
    },
    {
      type: "task_list",
      x: 60,
      y: 280,
      width: 260,
      height: 200,
      content: {
        title: "Getting Started",
        tasks: [
          { completed: false, title: "Create your first board" },
          { completed: false, title: "Add a sticky note or widget" },
          { completed: false, title: "Ask the AI to summarize this board" },
        ],
      },
    },
    {
      type: "kanban",
      x: 360,
      y: 260,
      width: 480,
      height: 260,
      content: {
        title: "My Workflow",
        columns: [
          {
            id: "todo",
            title: "To Do",
            cards: [{ id: "c1", title: "Plan sprint" }],
          },
          {
            id: "doing",
            title: "In Progress",
            cards: [{ id: "c2", title: "Build features" }],
          },
          { id: "done", title: "Done", cards: [] },
        ],
      },
    },
  ];

  await Promise.all(
    items.map((item) =>
      createCanvasItem({
        boardId: board.id,
        content: item.content,
        createdBy: "system",
        height: item.height,
        type: item.type,
        width: item.width,
        workspaceId,
        x: item.x,
        y: item.y,
      }),
    ),
  );

  return board;
}
