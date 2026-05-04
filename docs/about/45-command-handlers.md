# 45: Telegram Command Handlers

**Source:** `src/server/telegram/commands.ts` (279 lines)

## Why This Module Exists

Telegram messages arrive as raw text. `/boards` could mean "list my boards" or could be a typo. `/newboard Project Alpha` needs to parse the command name and its argument. The commands module:

1. Parses raw text into structured commands.
2. Dispatches known commands to the appropriate handler.
3. Enforces that mutation commands have a linked account.
4. Formats replies for Telegram's mobile interface.
5. Records audit events for all mutations.

## Core Types

```typescript
export type TelegramCommandInput = {
  telegramUserId: string;
  text: string;
};

export type TelegramCommandReply = {
  text: string;
};
```

`TelegramCommandInput` is what comes from the webhook route. `TelegramCommandReply` is what goes back — a single text string (not rich messages, not inline keyboards, not media).

## Command Parsing

### parseTelegramCommand — Extract the Command Name

```typescript
export function parseTelegramCommand(text: string): string {
  const [rawCommand = ""] = text.trim().split(/\s+/, 1);
  const command = rawCommand.split("@", 1)[0]?.toLowerCase() ?? "";

  return command;
}
```

#### Step-by-step

1. `text.trim()` — Remove leading/trailing whitespace.
2. `.split(/\s+/, 1)` — Take the first whitespace-delimited token.
3. `rawCommand` is now something like `/boards@MyWhiteboardBot` or just `/boards`.
4. `.split("@", 1)[0]` — Strip the `@BotName` suffix if present. This handles Telegram's convention where commands in group chats include the bot's username.
5. `.toLowerCase()` — Normalize case: `/BOARDS` and `/boards` are the same command.

#### @BotName Stripping

In Telegram, if a user is in a group chat with multiple bots, commands are suffixed with the bot's username: `/boards@MyWhiteboardBot`. The `@BotName` stripping ensures these are treated identically to `/boards` in a private chat.

**Edge case:** If someone sends `@MyWhiteboardBot /boards`, `parseTelegramCommand` returns `@mywhiteboardbot` (since `@` isn't stripped at the start). This would be unrecognized and fall through to "Unknown command." This is acceptable — it's a non-standard command format.

### parseCommandArgument — Extract the Argument

```typescript
export function parseCommandArgument(text: string): string {
  return text
    .trim()
    .replace(/^\S+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

#### Step-by-step

1. `text.trim()` — Remove outer whitespace.
2. `.replace(/^\S+\s*/, "")` — Remove the first word (the command) and any whitespace after it.
3. `.replace(/\s+/g, " ")` — Collapse multiple spaces/tabs/newlines into single spaces.
4. `.trim()` — Clean up any remaining edges.

#### Examples

```
Input: "/newboard   Project    Alpha   "
After step 1: "/newboard   Project    Alpha"
After step 2: "Project    Alpha   "
After step 3: "Project Alpha "
After step 4: "Project Alpha"
```

### parseAddNoteArgument — Specialized Parser for /addnote

```typescript
export type AddNoteArgument = {
  boardTitle: string;
  note: string;
};

export function parseAddNoteArgument(text: string): AddNoteArgument | null {
  const argument = parseCommandArgument(text);
  const separatorIndex = argument.indexOf(":");

  if (separatorIndex <= 0) {
    return null;
  }

  const boardTitle = argument.slice(0, separatorIndex).trim();
  const note = argument
    .slice(separatorIndex + 1)
    .replace(/\s+/g, " ")
    .trim();

  if (!boardTitle || !note) {
    return null;
  }

  return { boardTitle, note };
}
```

#### Format: `/addnote <board-title>: <note-text>`

```
Input: "/addnote Launch Plan: Add risk section"
       └──────────┘  └──────────┘ └────────────────┘
         command      argument

After parseCommandArgument: "Launch Plan: Add risk section"
                                  │            │
                            boardTitle       note
```

**Why colon-separated?** The `:` character is the natural separator for "target: content" in chat commands. It's intuitive, visually clear, and unlikely to appear in board titles (which are kept short per BOARDS.md rules).

**`separatorIndex <= 0` check:** If the colon is at position 0 (meaning the argument starts with `:`) or there's no colon at all, return null. This handles:
- `/addnote` (no argument at all — empty string after `parseCommandArgument`, `indexOf(":")` returns -1)
- `/addnote :note without board` (colon at position 0)
- `/addnote BoardTitle` (known format pattern but missing colon — safer to reject than guess)

**Empty boardTitle or note check:** If either side of the colon is empty after trimming, return null. This handles `/addnote :` and `/addnote Board:  `.

## Command Dispatch: handleTelegramTextCommand

```typescript
export async function handleTelegramTextCommand(
  input: TelegramCommandInput,
  dependencies: TelegramCommandDependencies = defaultDependencies,
): Promise<TelegramCommandReply> {
  const command = parseTelegramCommand(input.text);

  // ... routing logic ...
}
```

### Dependency Injection Pattern

```typescript
type TelegramCommandDependencies = {
  getActiveTelegramAccount: (telegramUserId: string) => Promise<TelegramAccount | null>;
  createBoard: (input: { ... }) => Promise<Board>;
  createCanvasItem: (input: { ... }) => Promise<{ id: string }>;
  listBoardsForWorkspace: (workspaceId: string) => Promise<Board[]>;
  listOpenTasksForWorkspace: (workspaceId: string) => Promise<Task[]>;
  recordAuditEvent: (input: { ... }) => Promise<unknown>;
};

const defaultDependencies: TelegramCommandDependencies = {
  createBoard,
  createCanvasItem,
  getActiveTelegramAccount,
  listBoardsForWorkspace,
  listOpenTasksForWorkspace,
  recordAuditEvent,
};
```

**Why DI?** The `dependencies` parameter defaults to the real implementations, but tests can inject mock functions. This makes every command testable without a database connection:

```typescript
// From commands.test.ts (hypothetical):
const result = await handleTelegramTextCommand(
  { telegramUserId: "123", text: "/boards" },
  {
    getActiveTelegramAccount: async () => ({ workspaceId: "ws1", ... }),
    listBoardsForWorkspace: async () => [{ title: "Test Board" }],
    // ... other mocks
  }
);
```

**Why DI instead of module mocking?**
- Module mocking (jest.mock) is fragile and IDE-unfriendly.
- DI makes the dependencies explicit in the function signature.
- DI works in any test runner without framework-specific mocking.
- DI prevents tests from accidentally calling real database functions.

### Command Routing Logic

```typescript
if (
  command !== "/boards" &&
  command !== "/tasks" &&
  command !== "/newboard" &&
  command !== "/addnote"
) {
  return {
    text: "Unknown command. Try /boards, /tasks, /newboard <title>, or /addnote <board>: <note>.",
  };
}
```

Unknown commands get a helpful response that lists valid commands. This is the only case that doesn't require a linked account — basic help should always be available.

### Account Linking Check

```typescript
const account = await dependencies.getActiveTelegramAccount(
  input.telegramUserId,
);

if (!account) {
  return { text: UNLINKED_REPLY };
}

// UNLINKED_REPLY = "Link your account from the web app before using Telegram commands."
```

This runs after command parsing but before any command-specific logic. Every recognized command (even read-only ones like `/boards` and `/tasks`) requires a linked account because they show workspace-specific data.

**Why check for read-only commands too?** It would be possible to return public board data without an account, but:
1. There's no concept of "public boards" in the current model.
2. Showing workspace data without authorization would be a data leak.
3. Consistency: all commands follow the same auth pattern.

### /boards Handler

```typescript
if (command === "/boards") {
  const boards = await dependencies.listBoardsForWorkspace(
    account.workspaceId,
  );

  return {
    text: formatBoardsReply(boards),
  };
}
```

The simplest handler. Queries boards, formats, returns.

### /newboard Handler

```typescript
if (command === "/newboard") {
  const title = parseCommandArgument(input.text);

  if (!title) {
    return { text: "Usage: /newboard <title>" };
  }

  const board = await dependencies.createBoard({
    createdBy: "user",
    title,
    workspaceId: account.workspaceId,
  });
  await dependencies.recordAuditEvent({
    action: "board.created",
    actorId: input.telegramUserId,
    actorType: "telegram",
    metadata: { command },
    summary: `Telegram created board: ${board.title}`,
    targetId: board.id,
    targetType: "Board",
    workspaceId: account.workspaceId,
  });

  return { text: `Created board: ${formatBoardTitle(board.title)}` };
}
```

**Usage validation:** If no title follows `/newboard`, return usage instructions instead of creating an empty-titled board.

**Audit event:** Every mutation records an `AuditEvent` row. This creates a permanent trace: who created what board, when, from which surface (web or Telegram).

**Reply format:** "Created board: Project Alpha" — short, clear, confirms the action.

### /addnote Handler

```typescript
if (command === "/addnote") {
  const noteInput = parseAddNoteArgument(input.text);

  if (!noteInput) {
    return { text: "Usage: /addnote <board>: <note>" };
  }

  const boards = await dependencies.listBoardsForWorkspace(
    account.workspaceId,
  );
  const board = findBoardByTitle(boards, noteInput.boardTitle);

  if (!board) {
    return { text: `Board not found: ${noteInput.boardTitle}` };
  }

  const item = await dependencies.createCanvasItem({
    boardId: board.id,
    content: { text: noteInput.note },
    createdBy: "user",
    height: 160,
    type: "sticky_note",
    width: 260,
    workspaceId: account.workspaceId,
    x: 0,
    y: 0,
  });
  await dependencies.recordAuditEvent({ ... });

  return { text: `Added note to ${formatBoardTitle(board.title)}.` };
}
```

**Board lookup by title:** `findBoardByTitle` matches the user's board title against workspace boards case-insensitively. This is a usability concession — requiring exact board IDs would make Telegram commands unusable.

**Default dimensions:** 260x160 — a standard sticky note aspect ratio. Position (0,0) means the note appears in the top-left corner of the board (user can reposition later).

**Canvas item type: `"sticky_note"`** — The standard type for text notes created via Telegram.

### /tasks Handler (Fall-Through)

```typescript
const tasks = await dependencies.listOpenTasksForWorkspace(
  account.workspaceId,
);

return {
  text: formatTasksReply(tasks),
};
```

The `/tasks` handler is the fall-through case — it's reached when the command isn't `/boards`, `/newboard`, or `/addnote`. Since unknown commands were already rejected, this is guaranteed to be `/tasks`.

## Reply Formatters

### formatBoardsReply

```typescript
export function formatBoardsReply(boards: Pick<Board, "title">[]): string {
  if (boards.length === 0) {
    return "No boards yet. Use /newboard <title> to create one.";
  }

  const visibleBoards = boards.slice(0, 10);
  const lines = visibleBoards.map(
    (board, index) => `${index + 1}. ${formatBoardTitle(board.title)}`,
  );
  const remaining = boards.length - visibleBoards.length;

  if (remaining > 0) {
    lines.push(`...and ${remaining} more.`);
  }

  return ["Recent boards:", ...lines].join("\n");
}
```

**Capped at 10:** Telegram messages have a 4096-character limit, but more importantly, users on phones don't want to scroll through 50 boards. 10 is a practical limit.

**Numbered list:** `1. Board One\n2. Board Two` — Clean, scannable format.

**Truncation notice:** `"...and 5 more."` lets users know there are more boards than shown.

**Empty state:** When there are no boards, suggest the `/newboard` command. Every empty state includes a clear next action.

### formatTasksReply

```typescript
export function formatTasksReply(
  tasks: Pick<Task, "dueAt" | "priority" | "title">[],
): string {
  if (tasks.length === 0) {
    return "No open tasks.";
  }

  const visibleTasks = tasks.slice(0, 10);
  const lines = visibleTasks.map((task, index) => {
    const due = task.dueAt ? ` due ${formatTaskDueDate(task.dueAt)}` : "";
    const priority = task.priority === "normal" ? "" : ` [${task.priority}]`;

    return `${index + 1}. ${formatBoardTitle(task.title)}${priority}${due}`;
  });
  const remaining = tasks.length - visibleTasks.length;

  if (remaining > 0) {
    lines.push(`...and ${remaining} more.`);
  }

  return ["Open tasks:", ...lines].join("\n");
}
```

**Priority display:** `[high]` suffix for non-normal priorities. Normal priority tasks don't show a tag (reduces visual noise).

**Due date format:** `due 2024-03-15 14:00` — ISO date + 24h time. Readable across timezones.

**Also capped at 10.**

### formatBoardTitle / normalizeBoardTitle

```typescript
function formatBoardTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim() || "Untitled board";
}

function normalizeBoardTitle(title: string): string {
  return formatBoardTitle(title).toLowerCase();
}
```

- `formatBoardTitle` collapses whitespace and provides a fallback for empty titles.
- `normalizeBoardTitle` lowercases for case-insensitive matching in `findBoardByTitle`.

### formatTaskDueDate

```typescript
function formatTaskDueDate(dueAt: Date): string {
  return dueAt.toISOString().slice(0, 16).replace("T", " ");
}
```

Converts a Date to `YYYY-MM-DD HH:MM` format. `slice(0, 16)` removes seconds and timezone offset. `replace("T", " ")` makes it more human-readable than the ISO T separator.

## findBoardByTitle

```typescript
export function findBoardByTitle(
  boards: Pick<Board, "id" | "title">[],
  title: string,
): Pick<Board, "id" | "title"> | null {
  const normalizedTitle = normalizeBoardTitle(title);

  return (
    boards.find(
      (board) => normalizeBoardTitle(board.title) === normalizedTitle,
    ) ?? null
  );
}
```

Case-insensitive, whitespace-insensitive board title matching. "Project Alpha" matches "project   alpha" and "PROJECT ALPHA".

**Why not exact match?** Telegram typing is imprecise. Users typing on phones make capitalization and spacing mistakes. Case-insensitive matching is a usability necessity, not a nice-to-have.

**Returns null, not throws:** If the board isn't found, the caller handles it gracefully with a "Board not found" message instead of crashing.

## Summary of Design Principles

1. **Dependency injection** — All DB access goes through injectable functions for testability.
2. **Account-linked gate** — All commands require account linking (read and write).
3. **Audit everything** — Every mutation records an `AuditEvent`.
4. **Mobile-first replies** — Lists capped at 10, messages are concise.
5. **Helpful errors** — Every error path returns actionable text ("Usage: /newboard <title>").
6. **Case-insensitive matching** — Board lookup normalizes titles.
7. **@BotName stripping** — Works in group chats as well as private chats.
