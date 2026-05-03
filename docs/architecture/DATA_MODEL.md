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
ChatThread
ChatMessage
ToolCall
CoreFile
Integration
AuditEvent
```

## Workspace

A workspace groups boards, assistant configuration, integrations, and user settings.

Suggested fields:

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
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "deletedAt": null
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
  "createdAt": "timestamp"
}
```
