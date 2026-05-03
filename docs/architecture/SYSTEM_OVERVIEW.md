# System Overview

## High-level components

```text
User
  ├─ Web UI
  │   ├─ Chat
  │   ├─ Board/Canvas
  │   ├─ Widget Library
  │   ├─ Task Center
  │   └─ Core MD Files UI
  │
  ├─ Telegram Bot
  │
  └─ Backend
      ├─ Auth/User Service
      ├─ Workspace/Board Service
      ├─ Canvas Item Service
      ├─ Assistant Runtime
      ├─ Tool Registry
      ├─ Widget Runtime/Sandbox Policy
      ├─ Task/Reminder Scheduler
      ├─ Telegram Adapter
      └─ Database
```

## Core concept

The assistant can perform actions through tools. The tools update persistent structured data.

The UI renders the structured data.

This means the assistant never needs to directly manipulate DOM or pixels. It creates and updates domain objects.

## Major data flow

```text
User prompt
  → Assistant runtime
  → Tool selection
  → Tool validation
  → Permission check
  → Database write
  → UI update
  → Execution card in chat
```

## Board rendering flow

```text
Board record
  → Canvas items
  → Renderer chooses item component by type
  → User/assistant edits update item data
  → Changes persist and can be audited
```

## Generated HTML widget flow

```text
User request
  → Assistant generates widget
  → Safety/policy validation
  → Preview
  → User confirmation
  → Sandboxed iframe render
  → Isolated widget state
  → Optional mediated board bridge
```

## Telegram flow

```text
Telegram message
  → Bot adapter
  → Account/link validation
  → Assistant or command parser
  → Tool call
  → Permission check
  → Persistent update
  → Telegram reply with result/link
```
