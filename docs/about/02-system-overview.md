# 02 — System Overview

## High-Level Architecture

The application is a single Next.js 16 monolith with two user-facing surfaces and a shared backend:

```
┌─────────────────────────────────────────────────────────┐
│                      Web UI                              │
│  Chat Panel  │ Board/Canvas │ Widget Library             │
│  Task Center │ Core MD Files│                            │
├─────────────────────────────────────────────────────────┤
│                   Telegram Bot                           │
│  Commands: /boards /tasks /newboard /addnote /remind     │
├─────────────────────────────────────────────────────────┤
│                     Backend                               │
│  ┌─────────┬──────────┬────────────┬──────────────────┐ │
│  │ Auth    │ Workspace│ Canvas Item│ Assistant Runtime │ │
│  │ Session │ /Board   │ Service    │ (LLM + Tools)     │ │
│  │ (JWT)   │ Service  │            │                   │ │
│  ├─────────┼──────────┼────────────┼──────────────────┤ │
│  │ Tool    │ Widget   │ Task/      │ Telegram Adapter  │ │
│  │ Registry│ Runtime  │ Reminder   │ (Webhook)         │ │
│  ├─────────┴──────────┴────────────┴──────────────────┤ │
│  │                  PostgreSQL                          │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Web UI

The web app at `http://localhost:3000` serves several distinct areas:

- **Chat Panel** — persistent chat threads (one per board). Users type prompts, the assistant responds with text or tool call cards. Chat history is restored when switching boards.
- **Board/Canvas** — the main whiteboard. Pan/zoom, drag-to-move, resize, click-to-create via toolbar. Renders structured canvas items by type (sticky notes, markdown blocks, task lists, Kanban boards, images, links, HTML widgets).
- **Widget Library** — browse available widget definitions (Task List, Kanban). Preview them before inserting onto the canvas.
- **Task Center** (`/tasks`) — cross-board task management with create, priority, due date, and mark-complete.
- **Core MD Files** (`/core`) — in-browser Markdown editor for the assistant's operating context files.

### Telegram Bot

Telegram is a control surface — not a separate product. Users can:

- Link their Telegram account via a one-time token from the web UI
- Run commands: `/boards`, `/tasks`, `/newboard <title>`, `/addnote <text>`, `/remind`, `/summarize`
- All Telegram mutations go through the same permission and audit model as web actions

### Backend Architecture

The backend lives in `src/server/` and `src/db/`. Key subsystems:

| Subsystem | Location | Role |
|---|---|---|
| Auth | `src/app/api/auth/` | NextAuth.js v4 credentials; JWT session with `userId` + `workspaceId` |
| Workspace/Board Service | `src/db/workspaces.ts`, `src/db/boards.ts` | CRUD for workspaces and hierarchical boards |
| Canvas Item Service | `src/db/canvas-items.ts` | CRUD for typed canvas items with soft delete |
| Assistant Runtime | `src/server/assistant/` | LLM adapter, tool registry, tool implementations |
| Tool Registry | `src/server/assistant/tools.ts` | Register, list, validate, and execute tools |
| Widget Runtime | `src/server/widgets/`, `src/db/widgets.ts` | Widget definition management, permissions, source storage |
| Task/Reminder | `src/db/tasks.ts`, `src/db/reminders.ts` | Task CRUD with priority/due dates, scheduled reminders |
| Telegram Adapter | `src/server/telegram/`, `src/db/telegram.ts` | Account linking, webhook dispatch, command handlers |
| Database | `src/db/client.ts`, Prisma | Connection-pooled PostgreSQL via `@prisma/adapter-pg` |

## Core Concept: Structured Tool Operations

The fundamental architecture principle is:

> **Assistant performs actions through tools → tools update persistent structured data → UI renders structured data**

There is no screenshot-based or HTML-blob-based board storage. Canvas items are rows in the `CanvasItem` table with typed `content`, `style`, and `metadata` JSON columns. When the assistant creates a sticky note, it's an INSERT into `CanvasItem`. When you move it, it's a PATCH with new `x`/`y` values. The canvas renderer reads rows and draws them by type.

## Data Flows

### Major Flow — User Prompt to Canvas Update

```
User types prompt in chat
        │
        ▼
POST /api/chat  (threaded per board)
        │
        ▼
Assistant runtime: build messages from DB history
        │
        ▼
LLM adapter: send to OpenRouter (or local stub)
        │
        ▼
LLM responds with tool call (e.g., add_canvas_item)
        │
        ▼
Tool Registry: validate → execute → add_canvas_item tool
        │
        ▼
src/db/canvas-items.ts::createCanvasItem → INSERT into PostgreSQL
        │
        ▼
Return tool result to LLM for final grounded response
        │
        ▼
Chat UI auto-refreshes canvas → reads updated CanvasItem rows
        │
        ▼
BoardCanvas renders new item at specified (x, y)
```

### Board Rendering Flow

```
User navigates to board (URL param or sidebar click)
        │
        ▼
client fetches canvasItems via GET /api/canvas-items?boardId=...
        │
        ▼
src/db/canvas-items.ts::listCanvasItemsForBoard
  → SELECT * FROM CanvasItem WHERE boardId=? AND deletedAt IS NULL
        │
        ▼
Item array arrives in React component
        │
        ▼
BoardCanvas iterates items, maps type → renderer:
  sticky_note → StickyNoteRenderer (colored card with text)
  task_list  → TaskListRenderer (checkboxes with status)
  kanban     → KanbanRenderer (columns + cards)
  markdown   → MarkdownRenderer (rendered text block)
  link       → LinkRenderer (iframe embed)
  html_widget→ WidgetRenderer (sandboxed iframe)
        │
        ▼
Each renderer reads content/style/metadata from JSON columns
        │
        ▼
Canvas is interactive: pan/zoom via transform matrix,
  drag via onPointerDown/onPointerMove, resize via handles
        │
        ▼
On move/resize: debounced PATCH to /api/canvas-items/[id]
  with optimistic client update
```

### Widget Flow

```
User clicks widget in Widget Library → preview modal
        │
        ▼
"Insert" creates a CanvasItem of type "html_widget"
  with content.widgetDefinitionId pointing to WidgetDefinition
        │
        ▼
BoardCanvas renders as sandboxed iframe
  src=blob with the widget's HTML/CSS/JS
        │
        ▼
Widget permissions are explicit (stored as JSON array)
  No unrestricted network/storage/filesystem access
```

### Telegram Flow

```
User sends message to Telegram bot
        │
        ▼
POST /api/telegram/webhook (from Telegram servers)
        │
        ▼
Validate TELEGRAM_WEBHOOK_SECRET header (if configured)
        │
        ▼
Dispatch: /start <token> → consumeTelegramLinkToken
          /boards      → listBoardsForWorkspace → sendMessage
          /tasks       → listOpenTasksForWorkspace → sendMessage
          /newboard X  → createBoard → sendMessage
          /addnote X   → createCanvasItem → sendMessage
        │
        ▼
All mutations go through same DB helpers as web actions
  → same audit trail, same workspace ownership checks
```
