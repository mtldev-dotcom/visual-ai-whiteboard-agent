# 05 — Prisma Schema

The Prisma schema at `prisma/schema.prisma` (281 lines, as of May 2026) is the single source of truth for all 14 database models. Every table, column, relationship, index, and constraint is declared here.

## Generator Configuration

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

The client is generated into `src/generated/prisma/` — not the default `node_modules/.prisma/client/`. This makes it importable via the `@/generated/prisma/client` TypeScript path alias. The generator runs on `postinstall` and via `npm run db:generate`.

## Data Source

```prisma
datasource db {
  provider = "postgresql"
}
```

The `DATABASE_URL` environment variable is read by Prisma at generation time and schema migration time. It is **not** embedded in the schema file itself.

## All 14 Models

### 1. User

```prisma
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  name         String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  workspaces   Workspace[]
}
```

**Why this way:** `cuid()` generates collision-resistant IDs that sort well in indexes (unlike UUIDv4). `@unique` on email is enforced at the DB level — Prisma generates a unique index. `passwordHash` is a bcrypt hash (set via `bcryptjs.hashSync` during signup). The `workspaces` relation is one-to-many — a user can own multiple workspaces, though the current UI only creates one.

### 2. Workspace

```prisma
model Workspace {
  id                 String              @id @default(cuid())
  ownerUserId        String
  name               String
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  owner              User                @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  boards             Board[]
  canvasItems        CanvasItem[]
  widgets            WidgetInstance[]
  tasks              Task[]
  reminders          Reminder[]
  telegramLinkTokens TelegramLinkToken[]
  telegramAccounts   TelegramAccount[]
  auditEvents        AuditEvent[]
  chatThreads        ChatThread[]

  @@index([ownerUserId])
}
```

**Why this way:** Workspace is the top-level tenant boundary. `onDelete: Cascade` on the User relation means deleting a user removes their workspace. Every domain entity (boards, canvas items, tasks, etc.) has a `workspaceId` foreign key — every query starts with workspace scoping. The `@@index([ownerUserId])` ensures fast workspace lookup by user.

The workspace owns references to 10 child models — boards, canvas items, widgets, tasks, reminders, Telegram link tokens, Telegram accounts, audit events, and chat threads. This means every entity in the system is ultimately scoped to a workspace.

### 3. Board

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

**Why this way:** Boards are hierarchical via the self-referential `parentBoardId`. The named relation `"BoardSubBoards"` is required because there are two relations between the same model. `onDelete: SetNull` on the parent means deleting a parent board orphans its sub-boards rather than cascading the delete — this is safer because sub-boards may contain useful data.

`archivedAt` is the soft-delete mechanism. Database helpers like `listBoardsForWorkspace` filter `archivedAt: null`. Archived boards are hidden from the UI but retained in the database.

`createdBy` is a string that records who made the board — `"user"`, `"assistant"`, `"system"`, or `"import"`.

### 4. CanvasItem

```prisma
model CanvasItem {
  id             String    @id @default(cuid())
  workspaceId    String
  boardId        String
  type           String
  x              Float
  y              Float
  width          Float
  height         Float
  content        Json
  style          Json      @default("{}")
  metadata       Json      @default("{}")
  safetyMetadata Json      @default("{}")
  createdBy      String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([boardId])
  @@index([type])
}
```

**Why this way:** This is the heart of the canvas engine. Every visual element on the board is a CanvasItem row. The `type` field determines the renderer used (`sticky_note`, `task_list`, `kanban`, `markdown`, `image`, `link`, `html_widget`, `text`).

The four JSON columns are the key architectural decision:
- `content` — what the item *is* (text for a note, columns+cards for a Kanban)
- `style` — how the item *looks* (background color, font size, border radius)
- `metadata` — operational data (creation context, tags, revision notes)
- `safetyMetadata` — security context (permission level, content flags, sandbox requirements)

`onDelete: Cascade` on both workspace and board means deleting a board removes all its canvas items. `deleteAt` is the soft-delete timestamp — queries filter `deletedAt: null`. Items are never hard-deleted through the app.

The `@@index([type])` enables fast filtering by item kind (e.g., "show me all Kanban boards on this board").

### 5. WidgetDefinition

```prisma
model WidgetDefinition {
  id              String   @id @default(cuid())
  key             String   @unique
  name            String
  description     String
  kind            String
  category        String
  version         String
  renderStrategy  String
  permissions     Json     @default("[]")
  stateSchema     Json     @default("{}")
  sourceVersioned Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  instances WidgetInstance[]
  sources   CustomHtmlWidgetSource[]

  @@index([kind])
  @@index([category])
}
```

**Why this way:** A widget definition is a *template* — it describes what a widget type does, how it renders, and what permissions it needs. Instances are created from definitions.

- `key` — programmatic identifier, used in tool calls (`"task_list"`, `"kanban"`)
- `kind` — `"built_in"` or `"custom_html"` — determines whether the renderer is native React or sandboxed iframe
- `renderStrategy` — for custom HTML widgets, this is `"sandboxed_iframe"` (the only render strategy for generated widgets)
- `permissions` — a JSON array of allowed capabilities (`["network", "storage"]` — always empty by default for safety)
- `stateSchema` — a JSON Schema describing the widget's expected state shape
- `sourceVersioned` — boolean flag indicating whether this widget supports versioned source code (true for custom HTML widgets)

### 6. WidgetInstance

```prisma
model WidgetInstance {
  id                 String   @id @default(cuid())
  workspaceId        String
  boardId            String?
  canvasItemId       String?
  widgetDefinitionId String
  state              Json     @default("{}")
  permissions        Json     @default("[]")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  workspace        Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board            Board?           @relation(fields: [boardId], references: [id], onDelete: Cascade)
  widgetDefinition WidgetDefinition @relation(fields: [widgetDefinitionId], references: [id], onDelete: Restrict)

  @@index([workspaceId])
  @@index([boardId])
  @@index([widgetDefinitionId])
}
```

**Why this way:** A WidgetInstance is a *concrete widget on a board*. It links to both a CanvasItem (where it lives visually) and a WidgetDefinition (what it *is*).

- `onDelete: Restrict` on WidgetDefinition means you cannot delete a definition while instances exist. This prevents orphaned widgets.
- `state` holds the widget's runtime data (e.g., which tasks are checked off)
- `permissions` is a per-instance override of the definition's permissions (can be more restrictive but not more permissive)
- `canvasItemId` links the instance to its visual representation on the canvas

### 7. CustomHtmlWidgetSource

```prisma
model CustomHtmlWidgetSource {
  id                 String    @id @default(cuid())
  widgetDefinitionId String
  version            String
  html               String
  css                String?
  js                 String?
  createdBy          String
  riskLevel          String    @default("low")
  approvedAt         DateTime?
  createdAt          DateTime  @default(now())

  widgetDefinition WidgetDefinition @relation(fields: [widgetDefinitionId], references: [id], onDelete: Cascade)

  @@unique([widgetDefinitionId, version])
  @@index([riskLevel])
}
```

**Why this way:** Generated HTML widgets have their source code (HTML + optional CSS + optional JS) stored in this model. The `@@unique([widgetDefinitionId, version])` constraint ensures one source per definition per version — enabling versioned rollback.

- `riskLevel` — `"low"`, `"medium"`, or `"high"` — determined by analyzing the generated code. High-risk widgets require explicit approval (`approvedAt`).
- `onDelete: Cascade` — deleting a definition removes all its source snapshots.
- `createdBy` tracks who generated this version.

### 8. Task

```prisma
model Task {
  id           String    @id @default(cuid())
  workspaceId  String
  boardId      String?
  canvasItemId String?
  title        String
  description  String?
  status       String    @default("open")
  priority     String    @default("normal")
  dueAt        DateTime?
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  completedAt  DateTime?

  workspace Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board?     @relation(fields: [boardId], references: [id], onDelete: SetNull)
  reminders Reminder[]

  @@index([workspaceId])
  @@index([boardId])
  @@index([status])
  @@index([dueAt])
}
```

**Why this way:** Tasks exist at workspace level but can be associated with a specific board and canvas item. `status` defaults to `"open"` — the only other current value is `"completed"`. `priority` has three levels: `"low"`, `"normal"`, `"high"`. `completedAt` is set when status changes to completed.

The `@@index([dueAt])` and `@@index([status])` enable efficient querying for "open tasks due this week."

`onDelete: SetNull` on the Board relation means a board can be deleted without losing its tasks — they remain at the workspace level.

### 9. Reminder

```prisma
model Reminder {
  id           String    @id @default(cuid())
  workspaceId  String
  boardId      String?
  canvasItemId String?
  taskId       String?
  title        String
  remindAt     DateTime
  status       String    @default("scheduled")
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sentAt       DateTime?
  canceledAt   DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board?    @relation(fields: [boardId], references: [id], onDelete: SetNull)
  task      Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([workspaceId])
  @@index([boardId])
  @@index([taskId])
  @@index([remindAt])
  @@index([status])
}
```

**Why this way:** Reminders can be linked to a specific task, board, or canvas item — but all are optional. `remindAt` is the absolute time the reminder fires. `status` values: `"scheduled"`, `"sent"`, `"canceled"`.

The `@@index([remindAt])` and `@@index([status])` make the job scheduler efficient — `SELECT * FROM Reminder WHERE status='scheduled' AND remindAt <= NOW()` is fully indexed.

### 10. TelegramLinkToken

```prisma
model TelegramLinkToken {
  id          String    @id @default(cuid())
  ownerUserId String
  workspaceId String
  tokenHash   String    @unique
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime  @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([ownerUserId])
  @@index([workspaceId])
  @@index([expiresAt])
}
```

**Why this way:** When a user wants to link their Telegram account, the app generates a one-time use token. The plaintext token is shown to the user once; only the SHA-256 hash is stored. The token is consumed via `POST /api/telegram/webhook` when a Telegram user sends `/start <token>`.

The `@@index([expiresAt])` supports cleanup of expired unused tokens. Token expiry is verified in application code (`isTelegramLinkTokenExpired`), not at the database level.

### 11. TelegramAccount

```prisma
model TelegramAccount {
  id             String    @id @default(cuid())
  ownerUserId    String    @unique
  workspaceId    String
  telegramUserId String    @unique
  username       String?
  firstName      String?
  lastName       String?
  linkedAt       DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  unlinkedAt     DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([unlinkedAt])
}
```

**Why this way:** One user can have one linked Telegram account (`ownerUserId` is unique). Similarly, one Telegram user ID can be linked to only one app account (`telegramUserId` is unique). Both constraints are enforced by `@unique` at the database level.

`unlinkedAt` is the soft-delete for unlinking. `getActiveTelegramAccount` filters `unlinkedAt: null`. The `@@index([unlinkedAt])` supports queries for active accounts.

### 12. ChatThread

```prisma
model ChatThread {
  id          String        @id @default(cuid())
  workspaceId String
  boardId     String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  workspace Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  messages  ChatMessage[]

  @@index([workspaceId])
  @@index([boardId])
}
```

**Why this way:** One chat thread per board. The `getOrCreateThreadForBoard` helper upserts by `workspaceId` + `boardId`. When a user opens a board, their chat history for that board is restored. Threads are cheap — just an ID, workspace, and optional board reference.

`boardId` is nullable to support board-less chat threads (future use case). The `@@index([boardId])` enables fast thread lookup by board.

### 13. ChatMessage

```prisma
model ChatMessage {
  id         String   @id @default(cuid())
  threadId   String
  role       String
  content    String
  toolName   String?
  toolStatus String?
  createdAt  DateTime @default(now())

  thread ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([threadId])
  @@index([createdAt])
}
```

**Why this way:** Every message in a thread — user prompts, assistant responses with tool calls, and tool results — is a ChatMessage row. `toolName` and `toolStatus` are set for tool call messages so the UI can render tool execution cards.

- `role` — `"user"`, `"assistant"`, `"tool"` (for grounded tool results sent back to the LLM)
- `toolStatus` — `"pending"`, `"success"`, `"error"` — drives the tool card UI state

`onDelete: Cascade` on the thread means deleting a thread removes all its messages. `@@index([createdAt])` ensures chronological fetching is efficient.

### 14. AuditEvent

```prisma
model AuditEvent {
  id          String   @id @default(cuid())
  workspaceId String
  actorType   String
  actorId     String
  action      String
  targetType  String
  targetId    String
  summary     String
  metadata    Json     @default("{}")
  createdAt   DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([actorType])
  @@index([action])
  @@index([targetType, targetId])
}
```

**Why this way:** Every mutation in the system can produce an audit event. This is the immutable log — events are only created, never updated or deleted.

- `actorType` — `"user"`, `"assistant"`, `"system"`, `"telegram"`
- `targetType` — the model that was modified (`"Board"`, `"CanvasItem"`, `"Task"`, etc.)
- `targetId` — the specific row that was modified
- `summary` — human-readable description of what happened
- `metadata` — JSON with contextual details (old values, new values, tool parameters)

The composite `@@index([targetType, targetId])` enables querying "all events that affected this specific canvas item."

## Key Design Decisions

### CUID Primary Keys

Every model uses `@id @default(cuid())` — collision-resistant IDs generated by the database layer via Prisma. CUIDs are shorter than UUIDs, sort well by creation time, and are URL-safe.

### Soft Delete with deletedAt / archivedAt / unlinkedAt / canceledAt

Instead of hard-deleting rows, models that can be "removed" use nullable `DateTime` columns. The reasons:
1. **Audit trail** — you can see when something was removed and by whom
2. **Undo support** — a soft-deleted item can be restored by setting the field to null
3. **Referential integrity** — foreign keys remain valid even after "deletion"
4. **Safety** — no accidental data loss from a single API call

### JSON Columns for Flexible Data

`CanvasItem`, `WidgetDefinition`, `WidgetInstance`, and `AuditEvent` use `Json` typed columns. Postgres stores these as `JSONB` — binary JSON that supports indexing and querying. This gives structure where needed (typed columns for `x`, `y`, `id`) and flexibility where needed (arbitrary content payloads).

### Workspace Ownership on Everything

Every model that isn't a user or a global widget definition has `workspaceId`. This means:
- Every query can be scoped to a workspace
- Multi-tenant isolation is at the database level
- Session-based access control: the JWT token has `workspaceId`, and middleware/API routes use it in every DB query

### Cascade Deletes for Workspace Scoping

Most child models cascade-delete from Workspace. This means deleting a workspace cleanly removes all its data. Models that should survive board deletion use `SetNull` — tasks and reminders remain at the workspace level if their board is deleted.

### SetNull for Optional Parent/Board Relationships

When a board is deleted, canvas items are cascade-deleted (they're meaningless without a board). But tasks, reminders, and sub-boards use `SetNull` — they survive but lose their board context. This is a deliberate design choice: tasks have meaning independent of boards, but sticky notes don't.
