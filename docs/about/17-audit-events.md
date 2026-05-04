# 17 — Audit Events

**Files:** `prisma/schema.prisma` (model), `src/db/audit.ts` (create helper)

The audit event system records every meaningful action in the application. Every board creation, canvas item modification, assistant tool call, Telegram command execution, and permission change creates an audit event.

## Why audit events?

- **Traceability**: "Who created this sticky note?" and "When was this board archived?" are answerable.
- **Undo support**: The audit trail provides the information needed to reverse actions.
- **Assistant accountability**: Every AI tool call is logged — users can see exactly what the assistant did.
- **Debugging**: When something goes wrong, the audit trail shows the sequence of events leading to it.
- **Compliance**: Even though this is a personal productivity tool, having a clear audit trail is good practice.

## The AuditEvent model

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

### Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Unique ID for this event |
| `workspaceId` | `String` | Scope within the tenant |
| `actorType` | `String` | Who performed the action |
| `actorId` | `String` | Identifier for the actor |
| `action` | `String` | What happened, in noun.verb notation |
| `targetType` | `String` | What was affected (model name) |
| `targetId` | `String` | Which specific record was affected |
| `summary` | `String` | Human-readable description |
| `metadata` | `Json` | Optional structured data about the event |
| `createdAt` | `DateTime` | When the event occurred |

### Actor types

| Value | Meaning | actorId examples |
|---|---|---|
| `user` | The human user via the web UI | User ID (e.g., `clx...`) |
| `assistant` | The AI assistant via a tool call | Assistant run ID |
| `system` | Automated process | System (e.g., `"onboarding"`, `"scheduler"`) |
| `telegram` | A Telegram bot command | Telegram user ID |

### Action naming convention

Actions follow a `noun.verb` pattern:

| Action | Meaning |
|---|---|
| `board.created` | New board was created |
| `board.updated` | Board title/description changed |
| `board.archived` | Board was soft-archived |
| `canvas_item.created` | New canvas item placed |
| `canvas_item.updated` | Canvas item position/content/style changed |
| `canvas_item.deleted` | Canvas item soft-deleted |
| `task.created` | New task created |
| `task.completed` | Task marked complete |
| `task.reopened` | Task uncompleted |
| `reminder.created` | New reminder scheduled |
| `reminder.sent` | Reminder notification sent |
| `reminder.canceled` | Reminder canceled before firing |
| `widget.created` | Widget instance created |
| `widget.updated` | Widget state changed |
| `assistant.tool_call` | AI assistant executed a tool |
| `telegram.command` | Telegram bot command executed |
| `permission.granted` | Permission was granted |
| `workspace.created` | Workspace was created |

### Indexes

```prisma
@@index([workspaceId])
@@index([actorType])
@@index([action])
@@index([targetType, targetId])
```

- `workspaceId`: Filtering events by workspace (most common query).
- `actorType`: "Show me everything the assistant did."
- `action`: "Show me all board.archived events."
- `(targetType, targetId)`: "Show me the history of board XYZ." — the composite index makes this lookup fast.

## The createAuditEvent helper (`src/db/audit.ts`)

```typescript
export type RecordAuditEventInput = {
  workspaceId: string;
  actorType: "user" | "assistant" | "system" | "telegram";
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export function recordAuditEvent(
  input: RecordAuditEventInput,
): Promise<AuditEvent> {
  return prisma.auditEvent.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      actorType: input.actorType,
      metadata: input.metadata ?? {},
      summary: input.summary,
      targetId: input.targetId,
      targetType: input.targetType,
      workspaceId: input.workspaceId,
    },
  });
}
```

Two naming decisions:
- **Function name**: `recordAuditEvent` (not `createAuditEvent`) — emphasizes that this is a side-effect, not a primary data creation.
- **Type name**: `RecordAuditEventInput` (not `CreateAuditEventInput`) — distinguishes audit from domain model creation.

## When audit events are recorded

### Board lifecycle
```typescript
// Board created
await recordAuditEvent({
  workspaceId, actorType: "user", actorId: session.userId,
  action: "board.created", targetType: "Board", targetId: board.id,
  summary: `Created board "${board.title}"`,
});

// Board archived
await recordAuditEvent({
  workspaceId, actorType: "user", actorId: session.userId,
  action: "board.archived", targetType: "Board", targetId: boardId,
  summary: `Archived board "${board.title}"`,
});
```

### Canvas item lifecycle
```typescript
// Canvas item created
await recordAuditEvent({
  workspaceId, actorType, actorId,
  action: "canvas_item.created", targetType: "CanvasItem", targetId: item.id,
  summary: `Created ${item.type} on board ${boardId}`,
  metadata: { type: item.type, x: item.x, y: item.y },
});

// Canvas item updated
await recordAuditEvent({
  workspaceId, actorType, actorId,
  action: "canvas_item.updated", targetType: "CanvasItem", targetId: userId,
  summary: `Updated ${item.type} on board ${item.boardId}`,
  metadata: { changedFields: ["x", "y"] },
});

// Canvas item deleted
await recordAuditEvent({
  workspaceId, actorType, actorId,
  action: "canvas_item.deleted", targetType: "CanvasItem", targetId: itemId,
  summary: `Deleted ${item.type} from board ${item.boardId}`,
});
```

### Assistant tool calls
```typescript
await recordAuditEvent({
  workspaceId, actorType: "assistant", actorId: runId,
  action: "assistant.tool_call", targetType: "CanvasItem", targetId: item.id,
  summary: `Assistant created sticky_note "${content.title}" on board ${boardId}`,
  metadata: { toolName: "create_canvas_item", runId, boardId },
});
```

### Telegram commands
```typescript
await recordAuditEvent({
  workspaceId, actorType: "telegram", actorId: String(telegramUserId),
  action: "telegram.command", targetType: "Task", targetId: task.id,
  summary: `Telegram user @${username} created task "${task.title}"`,
  metadata: { command: "/task", chatId },
});
```

## metadata field usage

The `metadata` Json field carries structured context that's specific to the event type. Examples:

**Board creation metadata:**
```json
{
  "createdBy": "system",
  "fromTemplate": "project-kickoff"
}
```

**Canvas item movement:**
```json
{
  "previousPosition": { "x": 100, "y": 200 },
  "newPosition": { "x": 350, "y": 200 },
  "distanceMoved": 250
}
```

**Assistant tool call:**
```json
{
  "toolName": "create_canvas_item",
  "runId": "run_abc123",
  "threadId": "thread_xyz",
  "input": { "type": "sticky_note", "boardId": "board_123" },
  "durationMs": 450
}
```

## What is NOT audited

To keep the audit volume manageable, some events are intentionally not recorded:

- **Read operations**: GET requests don't create audit events. The audit trail records mutations, not reads.
- **Session events**: Sign-in, sign-out, and token refresh are handled by NextAuth's own logging.
- **Failed operations**: If a write fails or is rejected by validation, no audit event is created (there's nothing to audit).
- **Heartbeat/ping**: Health checks and polling don't create audit events.

## Performance considerations

Audit events are an **append-only** table — they grow indefinitely. Considerations:

| Concern | Mitigation |
|---|---|
| Write overhead | `create` is a single INSERT; negligible overhead on top of the domain write |
| Read performance | Composite indexes on `(targetType, targetId)` and `(workspaceId, createdAt)` make history queries fast |
| Storage growth | Audit events can be archived/deleted after a configurable retention period (TBD) |
| Query isolation | Always query with `workspaceId` to avoid full table scans |

## Future: audit event UI

The current implementation focuses on recording events. A UI for viewing the audit trail is a planned future feature:

- **Per-object history**: "Show history of board XYZ" — filtered by `targetType: "Board"` and `targetId: boardId`.
- **Activity feed**: "Recent activity in workspace" — filtered by `workspaceId`, ordered by `createdAt desc`, limited to last 50 events.
- **Assistant activity**: "What did the AI do?" — filtered by `actorType: "assistant"`.
- **Telegram activity**: "Commands received via Telegram" — filtered by `actorType: "telegram"`.

The audit event model already supports all of these queries.

---

**Previous:** [16-tasks-reminders.md](./16-tasks-reminders.md)
