# 14 — Boards

**Files:** `prisma/schema.prisma` (model), `src/db/boards.ts` (CRUD), `src/server/board-templates.ts` (templates), `src/server/onboarding.ts` (onboarding board)

Boards are the second level of organization after workspaces. Every board contains canvas items, can have sub-boards, and can be soft-archived.

## The Board model

```prisma
model Board {
  id            String    @id @default(cuid())
  workspaceId   String
  parentBoardId String?
  title         String
  description   String?
  createdBy     String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  archivedAt    DateTime?

  workspace   Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parentBoard Board?           @relation("BoardSubBoards", fields: [parentBoardId], references: [id], onDelete: SetNull)
  subBoards   Board[]          @relation("BoardSubBoards")
  canvasItems CanvasItem[]
  widgets     WidgetInstance[]
  tasks       Task[]
  reminders   Reminder[]

  @@index([workspaceId])
  @@index([parentBoardId])
}
```

### Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Primary key |
| `workspaceId` | `String` | Which workspace the board belongs to |
| `parentBoardId` | `String?` | Optional parent board for sub-boards |
| `title` | `String` | Display name |
| `description` | `String?` | Optional longer description |
| `createdBy` | `String` | Actor: `user`, `assistant`, `system`, or `import` |
| `createdAt` | `DateTime` | Auto-set on creation |
| `updatedAt` | `DateTime` | Auto-updated on any change |
| `archivedAt` | `DateTime?` | Set when board is archived (soft delete) |

### Self-relation: parent/sub-board

```prisma
parentBoard Board?  @relation("BoardSubBoards", fields: [parentBoardId], references: [id], onDelete: SetNull)
subBoards   Board[] @relation("BoardSubBoards")
```

This is a self-referential relation. A board can have one parent and many children (sub-boards). This creates a tree structure:

```
Workspace
├── Board A (parentBoardId = null)
│   ├── Sub-board A1 (parentBoardId = Board A.id)
│   └── Sub-board A2 (parentBoardId = Board A.id)
└── Board B (parentBoardId = null)
    └── Sub-board B1 (parentBoardId = Board B.id)
```

The relation is named `BoardSubBoards` to disambiguate it from other relations on the Board model. `onDelete: SetNull` means deleting a parent board sets `parentBoardId` to `null` on its children rather than cascading the delete — sub-boards are preserved.

### Indexes

```prisma
@@index([workspaceId])
@@index([parentBoardId])
```

- `workspaceId`: Listing all boards in a workspace (most common query).
- `parentBoardId`: Listing sub-boards of a parent board.

## CRUD operations (`src/db/boards.ts`)

### createBoard

```typescript
export type CreateBoardInput = {
  workspaceId: string;
  title: string;
  description?: string;
  createdBy: "user" | "assistant" | "system" | "import";
};

export function createBoard(input: CreateBoardInput): Promise<Board> {
  return prisma.board.create({
    data: {
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}
```

`createdBy` tracks who or what created the board:
- **`user`**: The human user via the web UI.
- **`assistant`**: The AI assistant via a tool call.
- **`system`**: Automated creation (templates, onboarding, seeds).
- **`import`**: Data imported from external sources.

### createSubBoard

```typescript
export type CreateSubBoardInput = CreateBoardInput & {
  parentBoardId: string;
};

export function createSubBoard(input: CreateSubBoardInput): Promise<Board> {
  return prisma.board.create({
    data: {
      workspaceId: input.workspaceId,
      parentBoardId: input.parentBoardId,
      title: input.title,
      description: input.description,
      createdBy: input.createdBy,
    },
  });
}
```

Same as `createBoard` but with `parentBoardId` set. This establishes the parent-child relationship.

### listBoardsForWorkspace

```typescript
export function listBoardsForWorkspace(workspaceId: string): Promise<Board[]> {
  return prisma.board.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

Two important filters:
1. **`workspaceId`**: Scopes to the current workspace.
2. **`archivedAt: null`**: Excludes archived boards. Archived boards stay in the database but don't clutter the UI.

Ordered by `updatedAt` descending so recently modified boards appear first — this matches user expectations (the board you just edited should be at the top).

### getBoardById

```typescript
export function getBoardById(boardId: string): Promise<Board | null> {
  return prisma.board.findFirst({
    where: {
      id: boardId,
      archivedAt: null,
    },
  });
}
```

Returns a single board by ID, excluding archived ones. Uses `findFirst` rather than `findUnique` so we can add the `archivedAt: null` filter. Returns `null` if the board doesn't exist or is archived.

### updateBoard

```typescript
export type UpdateBoardInput = {
  boardId: string;
  title?: string;
  description?: string | null;
};

export function updateBoard(input: UpdateBoardInput): Promise<Board> {
  return prisma.board.update({
    where: { id: input.boardId },
    data: {
      title: input.title,
      description: input.description,
    },
  });
}
```

Partial update — only the fields provided are changed. `description` can be set to `null` to clear it.

### archiveBoard (soft archive)

```typescript
export function archiveBoard(boardId: string): Promise<Board> {
  return prisma.board.update({
    where: { id: boardId },
    data: { archivedAt: new Date() },
  });
}
```

Soft delete by setting `archivedAt` to the current timestamp. The board and all its canvas items remain in the database but are excluded from all list/get queries (which filter `archivedAt: null`).

Why soft delete?
- **Recoverability**: Users can undo accidental archival.
- **Audit trail**: The board still exists in audit events.
- **Data integrity**: Canvas items, tasks, etc. maintain their `boardId` references.

### searchBoardsForWorkspace

```typescript
export function searchBoardsForWorkspace(
  workspaceId: string,
  query: string,
): Promise<Board[]> {
  return prisma.board.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      title: { contains: query, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
}
```

Case-insensitive substring search on board titles. Limited to 30 results to keep the search bar snappy. The `mode: "insensitive"` uses PostgreSQL's `ILIKE` under the hood.

### listSubBoards

```typescript
export function listSubBoards(parentBoardId: string): Promise<Board[]> {
  return prisma.board.findMany({
    where: {
      parentBoardId,
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

Returns non-archived sub-boards of a given parent, ordered by recency.

## Template system (`src/server/board-templates.ts`)

Pre-built boards that users can instantiate with one click.

### The BOARD_TEMPLATES array

```typescript
export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Goals, tasks, and notes for starting a new project.",
    items: [ /* sticky notes, task lists, kanban */ ],
  },
  {
    id: "brainstorm",
    name: "Brainstorm Session",
    description: "Capture and organise ideas with sticky notes and a Kanban.",
    items: [ /* idea sticky notes + prioritisation kanban */ ],
  },
  {
    id: "weekly-review",
    name: "Weekly Review",
    description: "Reflect on wins, blockers, and next-week priorities.",
    items: [ /* wins/blockers sticky notes + task lists */ ],
  },
];
```

### Template 1: Project Kickoff

Creates a board with:
- A **sticky note** titled "Project Goals" with numbered prompts.
- A **task list** titled "Launch Checklist" with 4 initial tasks (scope, owners, milestones, kickoff meeting).
- A **kanban** titled "Sprint Board" with columns: Backlog, In Progress, Review, Done (one starter card in Backlog).
- A **sticky note** titled "Meeting Notes".

Positioned in two columns: left column has goals + kanban, right column has task list + meeting notes.

### Template 2: Brainstorm Session

Creates a board with:
- Three large **sticky notes** side by side for jotting ideas.
- A **kanban** titled "Prioritise Ideas" with columns: Raw Ideas, Promising, Action Items.

### Template 3: Weekly Review

Creates a board with:
- A **task list** titled "This Week" with checkboxes (some pre-marked complete).
- A **sticky note** titled "Wins" for reflecting on what went well.
- A **sticky note** titled "Blockers" for identifying obstacles.
- A **task list** titled "Next Week" with priority slots.

### createBoardFromTemplate

```typescript
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
```

Key details:
- The board's `createdBy` is `"user"` (the user chose to create it).
- The canvas items within have `createdBy: "system"` (they were generated programmatically, not placed by the user).
- All canvas items are created in parallel via `Promise.all` for speed.
- Returns `{ boardId, boardTitle }` so the frontend can navigate the user to the new board immediately.

## Onboarding board (`src/server/onboarding.ts`)

Created automatically when a new user signs up (called from the signup flow):

```typescript
export async function seedOnboardingBoard(workspaceId: string) {
  const board = await createBoard({
    createdBy: "system",
    description: "Your starting point — edit, add, or ask the AI to help.",
    title: "Welcome Board",
    workspaceId,
  });
  // ... creates 4 canvas items ...
  return board;
}
```

The Welcome Board contains:
1. **Sticky note**: "Welcome" — explains what the whiteboard is and how to use it.
2. **Sticky note**: "Quick Notes" — encourages jotting things down.
3. **Task list**: "Getting Started" — 3 concrete action items.
4. **Kanban**: "My Workflow" — To Do / In Progress / Done with starter cards.

All items have `createdBy: "system"`.

## BoardExplorer component

The BoardExplorer is the UI component that lets users browse, search, and switch between boards. While the component lives in the frontend (not documented in depth here), its key behaviors are:

1. **List**: Shows all non-archived boards for the current workspace, ordered by `updatedAt` descending.
2. **Search**: A search input with 300ms debounce. As the user types, it calls the search API (which uses `searchBoardsForWorkspace`). A spinner shows while results load.
3. **Create**: A "New Board" button that opens a create dialog. User enters title + optional description.
4. **Template picker**: A "From Template" option that shows the three templates (Project Kickoff, Brainstorm, Weekly Review). Selecting one calls `createBoardFromTemplate`.
5. **Board selection**: Clicking a board navigates to it in the canvas view.

## Board API routes

### `GET /api/boards`

Lists all boards for the current workspace. Calls `requireSession()`, then `listBoardsForWorkspace(session.workspaceId)`.

### `POST /api/boards`

Creates a new board. Accepts `{ title, description }`. Sets `createdBy: "user"`.

### `GET /api/boards/[id]`

Returns a single board. Calls `requireSession()`, then `getBoardById(id)`. Verifies the board belongs to the session's workspace.

### `PATCH /api/boards/[id]`

Updates a board's `title` and/or `description`. Calls `requireSession()`, verifies workspace ownership, then `updateBoard()`.

### `DELETE /api/boards/[id]`

Soft-archives a board. Calls `requireSession()`, verifies workspace ownership, then `archiveBoard()`.

### `POST /api/boards/from-template`

Creates a board from one of the three templates. Accepts `{ templateId }`. Calls `createBoardFromTemplate()`.

## Board ownership verification

Every board API route verifies workspace ownership before operating:

```typescript
const { session, error } = await requireSession();
if (error) return error;
const board = await getBoardById(id);
if (!board || board.workspaceId !== session.workspaceId) {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
```

We return `404` (not `403`) when the board doesn't belong to the user's workspace. This avoids leaking whether a board ID exists in another workspace.

**Next:** [15-canvas-items.md](./15-canvas-items.md) — the CanvasItem model, allowed types, content schemas, and CRUD operations.
