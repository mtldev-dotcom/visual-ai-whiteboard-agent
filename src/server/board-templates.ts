import type { Prisma } from "@/generated/prisma/client";
import { createBoard } from "../db/boards";
import { createCanvasItem } from "../db/canvas-items";

type TemplateItem = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: Prisma.InputJsonObject;
};

type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  items: TemplateItem[];
};

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Goals, tasks, and notes for starting a new project.",
    items: [
      {
        type: "sticky_note",
        x: 60, y: 60, width: 220, height: 160,
        content: { title: "Project Goals", text: "What does success look like?\n\n1. \n2. \n3. " },
      },
      {
        type: "task_list",
        x: 320, y: 60, width: 280, height: 240,
        content: {
          title: "Launch Checklist",
          tasks: [
            { completed: false, title: "Define scope" },
            { completed: false, title: "Assign owners" },
            { completed: false, title: "Set milestones" },
            { completed: false, title: "Schedule kickoff meeting" },
          ],
        },
      },
      {
        type: "kanban",
        x: 60, y: 260, width: 520, height: 280,
        content: {
          title: "Sprint Board",
          columns: [
            { id: "backlog", title: "Backlog", cards: [{ id: "b1", title: "Research phase" }] },
            { id: "doing", title: "In Progress", cards: [] },
            { id: "review", title: "Review", cards: [] },
            { id: "done", title: "Done", cards: [] },
          ],
        },
      },
      {
        type: "notes",
        x: 620, y: 260, width: 260, height: 160,
        content: { title: "Meeting Notes", text: "Date:\nAttendees:\n\nKey decisions:\n" },
      },
    ],
  },
  {
    id: "brainstorm",
    name: "Brainstorm Session",
    description: "Capture and organise ideas with sticky notes and a Kanban.",
    items: [
      {
        type: "sticky_note",
        x: 60, y: 60, width: 200, height: 160,
        content: { title: "Idea 💡", text: "Write your first idea here." },
      },
      {
        type: "sticky_note",
        x: 300, y: 60, width: 200, height: 160,
        content: { title: "Idea 💡", text: "Another idea…" },
      },
      {
        type: "sticky_note",
        x: 540, y: 60, width: 200, height: 160,
        content: { title: "Idea 💡", text: "Keep going!" },
      },
      {
        type: "kanban",
        x: 60, y: 260, width: 520, height: 260,
        content: {
          title: "Prioritise Ideas",
          columns: [
            { id: "raw", title: "Raw Ideas", cards: [] },
            { id: "promising", title: "Promising", cards: [] },
            { id: "action", title: "Action Items", cards: [] },
          ],
        },
      },
    ],
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Reflect on wins, blockers, and next-week priorities.",
    items: [
      {
        type: "task_list",
        x: 60, y: 60, width: 260, height: 220,
        content: {
          title: "This Week ✅",
          tasks: [
            { completed: true, title: "Team standup" },
            { completed: false, title: "Ship feature X" },
          ],
        },
      },
      {
        type: "sticky_note",
        x: 360, y: 60, width: 220, height: 160,
        content: { title: "Wins 🎉", text: "What went well this week?" },
      },
      {
        type: "sticky_note",
        x: 620, y: 60, width: 220, height: 160,
        content: { title: "Blockers 🚧", text: "What slowed you down?" },
      },
      {
        type: "task_list",
        x: 360, y: 260, width: 280, height: 200,
        content: {
          title: "Next Week 🗓️",
          tasks: [
            { completed: false, title: "Priority 1" },
            { completed: false, title: "Priority 2" },
            { completed: false, title: "Priority 3" },
          ],
        },
      },
    ],
  },
];

export async function createBoardFromTemplate(
  templateId: string,
  workspaceId: string,
): Promise<{ boardId: string; boardTitle: string } | null> {
  const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const board = await createBoard({
    createdBy: "user",
    description: template.description,
    title: template.name,
    workspaceId,
  });

  await Promise.all(
    template.items.map((item) =>
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

  return { boardId: board.id, boardTitle: board.title };
}
