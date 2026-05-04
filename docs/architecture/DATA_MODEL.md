# Data Model

## Core entities

```text
User
Workspace
Board
CanvasItem
WidgetDefinition
WidgetInstance
Task
Reminder
TelegramLinkToken
TelegramAccount
ChatThread
ChatMessage
ToolCall
CoreFile
Integration
AuditEvent
```

## Workspace

A workspace groups boards, assistant configuration, integrations, and user settings.

Implemented in `prisma/schema.prisma` as the first persistent model.

```json
{
  "id": "workspace_123",
  "ownerUserId": "user_123",
  "name": "My Workspace",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Board

A board can have a parent board.

Implemented in `prisma/schema.prisma` with workspace ownership and an explicit optional self-relation for parent/sub-board hierarchy. If a parent board is physically deleted, child boards keep their records and `parentBoardId` is set to null; normal board removal should use soft archive behavior.

```json
{
  "id": "board_123",
  "workspaceId": "workspace_123",
  "parentBoardId": null,
  "title": "Weekly Planner",
  "description": "Planning board for the week",
  "createdBy": "user",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "archivedAt": null
}
```

## CanvasItem

Canvas items are structured objects.

Implemented in `prisma/schema.prisma` with workspace/board ownership, geometry, JSON content/style/metadata payloads, safety metadata, created-by marker, timestamps, and soft delete.

```json
{
  "id": "item_123",
  "workspaceId": "workspace_123",
  "boardId": "board_123",
  "type": "sticky_note",
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 180,
  "content": {
    "text": "Launch idea"
  },
  "style": {},
  "metadata": {
    "createdBy": "assistant"
  },
  "safetyMetadata": {},
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "deletedAt": null
}
```

## WidgetDefinition

Implemented in `prisma/schema.prisma`.

Widget definitions describe prebuilt and custom HTML widgets. They include manifest-aligned fields such as key, name, description, kind, category, version, render strategy, permissions, state schema, and whether source is versioned.

## WidgetInstance

Implemented in `prisma/schema.prisma`.

Widget instances attach a widget definition to a workspace and optionally a board/canvas item. Instance state and granted permissions are stored separately from executable source.

## CustomHtmlWidgetSource

Implemented in `prisma/schema.prisma`.

Custom/generated HTML widget source is versioned separately from widget instance state. Source records include HTML, optional CSS/JS, created-by marker, risk level, approval timestamp, and creation timestamp.

## Task

Implemented in `prisma/schema.prisma`.

Tasks belong to a workspace and can optionally attach to a board or canvas item. They include title, optional description, status, priority, optional due date, created-by marker, timestamps, and completion timestamp.

## Reminder

Implemented in `prisma/schema.prisma`.

Reminders belong to a workspace and can optionally attach to a board, canvas item, or task. They include title, reminder time, status, created-by marker, timestamps, sent timestamp, and cancellation timestamp.

## TelegramLinkToken

Implemented in `prisma/schema.prisma`.

Telegram link tokens belong to a workspace and owner user. Only the SHA-256 token hash is stored. Tokens are short-lived, one-time credentials with an expiry timestamp and optional consumption timestamp.

```json
{
  "id": "telegram_link_123",
  "ownerUserId": "user_123",
  "workspaceId": "workspace_123",
  "tokenHash": "sha256_hex",
  "expiresAt": "timestamp",
  "consumedAt": null,
  "createdAt": "timestamp"
}
```

## TelegramAccount

Implemented in `prisma/schema.prisma`.

Telegram accounts link one app owner user to one Telegram user ID and default workspace. A linked account can be soft-unlinked with `unlinkedAt`; command handlers must only use active accounts.

```json
{
  "id": "telegram_account_123",
  "ownerUserId": "user_123",
  "workspaceId": "workspace_123",
  "telegramUserId": "123456789",
  "username": "telegram_user",
  "linkedAt": "timestamp",
  "unlinkedAt": null
}
```

## ChatThread

```json
{
  "id": "thread_123",
  "workspaceId": "workspace_123",
  "boardId": "board_123",
  "title": "Board planning chat",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## ToolCall

```json
{
  "id": "tool_call_123",
  "threadId": "thread_123",
  "messageId": "message_123",
  "toolName": "add_canvas_item",
  "status": "success",
  "input": {},
  "output": {},
  "createdAt": "timestamp"
}
```

## AuditEvent

Use audit events for persistent changes, especially from assistant and Telegram.

Implemented in `prisma/schema.prisma`.

Audit events belong to a workspace and record actor, action, target, summary, metadata, and timestamp. Telegram commands that mutate persistent data must record an audit event before replying success.

```json
{
  "id": "audit_123",
  "workspaceId": "workspace_123",
  "actorType": "assistant",
  "actorId": "assistant_default",
  "action": "canvas_item.created",
  "targetType": "CanvasItem",
  "targetId": "item_123",
  "summary": "Assistant created sticky note",
  "metadata": {},
  "createdAt": "timestamp"
}
```
