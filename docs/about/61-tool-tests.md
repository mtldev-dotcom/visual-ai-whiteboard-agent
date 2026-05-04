# Assistant Tool Tests

This chapter walks through every test file that validates assistant tool behavior. Understanding these patterns is essential for adding new tools or modifying existing ones without breaking the validation contract.

## Architecture of a Tool

Every assistant tool follows a consistent interface defined in `src/server/assistant/tools.ts`:

```ts
interface ToolDefinition {
  name: string;
  description: string;
  permissionLevel: number;
  requiresConfirmation?: boolean;
  validate: (input: unknown) => { ok: boolean; error?: string };
  execute: (
    input: Record<string, unknown>,
    context: { workspaceId: string; actor: { id: string; type: string } }
  ) => Promise<{ ok: boolean; error?: string; output?: unknown; summary?: string }>;
}
```

Every tool must have two critical functions:
- **`validate`** — a pure function that checks input shape. Returns `{ ok: false, error: "..." }` for invalid input. Must never call the database.
- **`execute`** — an async function that performs the actual work. Receives validated input plus an execution context containing `workspaceId` and `actor`.

Tests cover each function independently, then test their integration through the registry.

## canvas-tools.test.ts

**File:** `src/server/assistant/canvas-tools.test.ts` (99 lines, 10 tests)

This file tests the three most critical assistant tools: `add_canvas_item`, `update_canvas_item`, and `delete_canvas_item`.

### validateAddCanvasItemInput

Defines a `validInput` fixture:

```ts
const validInput = {
  boardId: "board-1",
  content: { text: "Hello" },
  height: 120,
  type: "sticky_note",
  width: 200,
  x: 10,
  y: 20,
};
```

Then tests five validation scenarios:

| Test | Input variation | Expected result |
|---|---|---|
| Accepts valid input | (none) | `{ ok: true }` |
| Rejects missing board ID | `boardId: ""` | `{ ok: false, error: "boardId is required." }` |
| Rejects invalid geometry | `width: 0` | `{ ok: false, error: "width and height must be greater than zero." }` |
| Rejects invalid content | `content: "bad"` | `{ ok: false, error: "content must be an object." }` |
| Rejects removed `notes` type | `type: "notes"` | `{ ok: false, error: "type must be one of: text, sticky_note, task_list, kanban, markdown, image, link, html_widget." }` |

**Why `notes` is tested separately.** Earlier sessions removed the `notes` item type (see `SESSION_HANDOFF.md`). Validation must reject it explicitly, and the test guarantees that a future developer who accidentally re-adds `notes` to the enum without updating the allowlist will get a failing test. The allowed-type list in the error message serves as the canonical allowlist — LLMs receive it as feedback so they can retry with a valid type.

### validateUpdateCanvasItemInput

Tests partial update semantics:

```ts
it("accepts partial updates", () => {
  expect(
    validateUpdateCanvasItemInput({
      content: { text: "Updated" },
      itemId: "item-1",
      x: 24,
    }),
  ).toEqual({ ok: true });
});
```

**Why partial updates matter.** The assistant should be able to say "move that note 10 pixels right" without having to re-send every field. The test confirms that sending only `x`, or only `content`, or a mix of any subset, is valid.

Additional tests:
- Rejects missing `itemId` (empty string).
- Rejects when `content` is a string instead of an object: `"content must be an object when provided."`

### validateDeleteCanvasItemInput

```ts
it("requires explicit confirmation", () => {
  expect(validateDeleteCanvasItemInput({ itemId: "item-1" })).toEqual({
    error: "confirmed must be true before deleting an item.",
    ok: false,
  });
});

it("accepts confirmed delete input", () => {
  expect(
    validateDeleteCanvasItemInput({ confirmed: true, itemId: "item-1" }),
  ).toEqual({ ok: true });
});
```

**Why `confirmed` is required.** The delete tool is marked `requiresConfirmation: true` in `specs/canvas-tools.schema.json`. The LLM call loop will not send `confirmed: true` automatically — it prompts the user first. Only after the user explicitly confirms does the assistant mark `confirmed: true` and retry. The validation test ensures that a tool call without `confirmed: true` is rejected at the input layer, before any database mutation happens.

---

## board-tools.test.ts

**File:** `src/server/assistant/board-tools.test.ts` (51 lines, 6 tests)

### validateCreateBoardInput

Tests board creation validation:

```ts
describe("validateCreateBoardInput", () => {
  it("accepts a title and optional description", () => { /* ... */ });
  it("rejects missing title", () => { /* ... */ });
  it("rejects invalid description", () => { /* ... */ });
});
```

**Key insight — `title` is required, `description` is optional.** The test validates both paths:
- A board with only `title` → `{ ok: true }`
- A board with `title` + `description` → `{ ok: true }`
- A board with `title: ""` → rejected
- A board with `description: 123` (number instead of string) → `{ error: "description must be a string when provided." }`

The type check for `description` is particularly important. LLMs sometimes pass numbers or booleans for fields described as "optional string." The validation catches this with a clear message.

### validateCreateSubBoardInput

```ts
it("rejects missing parent board id", () => {
  expect(validateCreateSubBoardInput({ title: "Research" })).toEqual({
    error: "parentBoardId is required.",
    ok: false,
  });
});
```

**Why `parentBoardId` is required for sub-boards.** Sub-boards are children of a parent board (representing drill-down navigation). Without `parentBoardId`, the system cannot establish the hierarchy. The test ensures the assistant cannot create orphan sub-boards.

### Workspace Ownership Checks

Board tools verify workspace ownership at the `execute` level (not the `validate` level). This is tested indirectly through the `actor` context:

```ts
const context = {
  actor: { id: "user-1", type: "user" },
  workspaceId: "workspace-1",
};
```

The execute function looks up the target board, verifies `board.workspaceId === context.workspaceId`, and rejects operations on boards belonging to other workspaces. This check is exercised in integration tests through the tool registry rather than in unit tests (since it requires a mock database).

---

## board-query-tools.test.ts

**File:** `src/server/assistant/board-query-tools.test.ts` (57 lines, 4 tests)

### summarizeCanvasItemContent

This is the core content-to-text function used by `summarize_board` and `list_canvas_items`. It converts structured item content into a human-readable preview string that the LLM can reason about.

```ts
it("includes text content in the preview", () => {
  const summary = summarizeCanvasItemContent({
    text: "What does success look like?",
    title: "Project Goals",
  });
  expect(summary.title).toBe("Project Goals");
  expect(summary.text).toBe("What does success look like?");
  expect(summary.preview).toContain("Title: Project Goals");
  expect(summary.preview).toContain("Text: What does success look like?");
});
```

**Why preview strings matter.** When the assistant calls `summarize_board`, the tool returns a structured text summary of every item on the board. The `preview` string is what the LLM "sees." If the preview is poorly formatted, the LLM will answer board questions incorrectly. The test validates:
- Each content type (text, tasks, kanban) produces a distinct preview.
- The preview includes both the structured fields (for programmatic use) and the human-readable string (for the LLM).

Additional tests:
- **Task completion state**: `[ ]` for incomplete, `[x]` for complete tasks in the preview.
- **Kanban columns**: column title + card count + card titles in the preview (e.g., `"Backlog (1 card: Research phase)"`).

---

## tools.test.ts

**File:** `src/server/assistant/tools.test.ts` (75 lines, 5 tests)

This tests the `createToolRegistry` function, which is the central dispatch mechanism for all assistant tools.

### Registry Operations

```ts
it("registers, lists, and executes a tool", async () => {
  const registry = createToolRegistry();
  registry.register({ /* echo tool */ });

  expect(registry.list()).toEqual([
    { description: "Echo input", name: "echo", permissionLevel: 1 },
  ]);

  await expect(
    registry.execute("echo", { text: "hi" }, context),
  ).resolves.toEqual({
    ok: true,
    output: { text: "hi" },
    summary: "Echoed input.",
  });
});
```

**Why test through the registry.** The chat route (`src/app/api/chat/route.ts`) calls `registry.list()` to build the LLM function definitions and `registry.execute()` to run tool calls. Testing through the exact same API that production uses provides end-to-end confidence without needing to mock HTTP.

### Duplicate Registration

```ts
it("rejects duplicate tool registration", () => {
  registry.register(tool);
  expect(() => registry.register(tool)).toThrow("Tool already registered");
});
```

**Why this throws.** Duplicate tool names would create ambiguity — which tool should execute for a given name? The registry rejects duplicates at registration time (server startup) rather than silently overwriting or failing at runtime when a tool is called.

### Structured Validation Errors

```ts
it("returns structured validation errors", async () => {
  registry.register({
    name: "reject",
    validate: () => ({ error: "Bad input", ok: false }),
    execute: async () => ({ ok: true, summary: "Should not run." }),
    /* ... */
  });

  await expect(registry.execute("reject", {}, context)).resolves.toEqual({
    error: "Bad input",
    ok: false,
    summary: "Tool input validation failed.",
  });
});
```

**Why the execute function should never be called when validation fails.** The test provides an execute function that returns `ok: true`, but because validation returned `ok: false`, the execute function is never invoked. The registry returns the validation error directly. This is the correct behavior — failed validation means the tool never runs.

---

## llm.test.ts

**File:** `src/server/assistant/llm.test.ts` (38 lines, 5 tests)

### Local Adapter Completes with Echo

```ts
it("returns the local adapter by default", async () => {
  const adapter = createLlmAdapter("");

  const response = await adapter.complete({
    messages: [{ role: "user", content: "Create a board" }],
  });

  expect(response.provider).toBe("local");
  expect(response.content).toContain("Create a board");
  expect(response.metadata?.coreContextLoaded).toBe(true);
  expect(response.toolCalls).toEqual([]);
});
```

**Why the local adapter echoes the input.** The local adapter is a development-only fallback. When `OPENROUTER_API_KEY` is not set, the assistant uses the local adapter, which echoes the user message as a no-op response. The test confirms:
- The provider is identified as `"local"`.
- The echo content includes the user's message.
- `coreContextLoaded` is `true` (the local adapter handles core context injection).
- No tool calls are generated (the local adapter does not simulate tool usage).

### Core Context Injection

```ts
it("accepts injected core context for deterministic tests", async () => {
  const adapter = createLlmAdapter("local");
  const response = await adapter.complete({
    coreContext: "core",
    messages: [],
  });
  expect(response.metadata).toEqual({
    coreContextCharacters: 4,
    coreContextLoaded: true,
  });
});
```

**Why core context is injectable.** The assistant loads `docs/agent-core/*.md` at the start of each chat session. For tests, this context is injected as a string to keep tests deterministic — the test doesn't need the file system to exist.

### Unsupported Provider Rejection

```ts
it("rejects unsupported providers", () => {
  expect(() => createLlmAdapter("unknown-provider")).toThrow(
    "Unsupported LLM provider",
  );
});
```

**Why this throws synchronously.** Provider misconfiguration is a startup-time error, not a runtime error. Throwing immediately during adapter creation means the server fails fast with a clear error message rather than silently defaulting to the wrong provider.

---

## Test Coverage Summary

| Tool | Validation tests | Execution tests | Content tests |
|---|---|---|---|
| `add_canvas_item` | 5 | 0 | 0 |
| `update_canvas_item` | 3 | 0 | 0 |
| `delete_canvas_item` | 2 | 0 | 0 |
| `create_board` | 3 | 0 | 0 |
| `create_sub_board` | 3 | 0 | 0 |
| `summarize_board` / `list_canvas_items` | 0 | 0 | 4 |
| Tool registry | 0 | 5 | 0 |
| LLM adapter | 0 | 3 | 0 |

**Gap notice:** Execution-level tests for most tools are not yet written. Current tests focus on validation (where bugs are most common) and content summarization (where LLM output quality is directly affected). Execution tests are the recommended next addition to the test suite.

## How to Add a New Tool Test

When you add a new assistant tool, follow this template:

1. **Create `<tool-name>.test.ts`** next to `<tool-name>.ts` in `src/server/assistant/`.
2. **Import the validate function** from the tool file.
3. **Write a `describe` block** for the validate function.
4. **Define a `validInput` fixture** that passes all validation.
5. **Add one test per rejection path** — each invalid field derives its own `it()` block.
6. **Add registry integration tests** in `tools.test.ts` if the tool interacts with the registry in a novel way.
7. **Run `npm test`** and confirm all new tests pass.
8. **Run `npm run typecheck`** and confirm types compile.
