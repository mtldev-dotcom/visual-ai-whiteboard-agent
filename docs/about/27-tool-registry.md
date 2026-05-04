# 27 — Tool Registry

**File:** `src/server/assistant/tools.ts` (80 lines)

## Purpose

The tool registry is the central system that defines, validates, and executes tools callable by the LLM assistant. It enforces:
- **Uniqueness**: No two tools can share the same name.
- **Validation**: Input is validated before execution.
- **Structured results**: Every tool returns `{ ok: boolean, summary: string, output?, error? }`.

## Core Types

### ToolActor

```tsx
export type ToolActor = {
  type: "user" | "assistant" | "system" | "telegram";
  id: string;
};
```

Identifies who (or what) is invoking a tool. Used to set `createdBy` markers on created items.

### ToolContext

```tsx
export type ToolContext = {
  workspaceId: string;
  actor: ToolActor;
};
```

Execution context passed to every tool. `workspaceId` is the authenticated workspace — tools use it to scope database queries and verify ownership.

### ToolValidationResult

```tsx
export type ToolValidationResult = { ok: true } | { ok: false; error: string };
```

A discriminated union — either validation passes (`ok: true`) or it fails with an error message (`ok: false, error: string`).

**Why a discriminated union rather than throwing?** Throwing to signal validation failure mixes control flow with error handling. A typed result makes the contract explicit: the `execute` method only receives validated input.

### ToolResult

```tsx
export type ToolResult<Output = unknown> = {
  ok: boolean;
  summary: string;
  output?: Output;
  error?: string;
};
```

Every tool returns this structure. Key fields:
- **`ok`**: Success/failure flag.
- **`summary`**: Always present — a human-readable one-liner about what happened. Used in the chat UI's tool card display.
- **`output`**: Structured data for the LLM to consume (or null). The LLM uses this for grounding its response.
- **`error`**: Error message when `ok` is false.

**Why always include `summary`?** The chat UI renders tool cards for every tool call. A missing summary would show a blank card. Making it required ensures every tool result has a display string.

### ToolDefinition

```tsx
export type ToolDefinition<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  permissionLevel: 1 | 2 | 3 | 4;
  validate(input: unknown): ToolValidationResult | Promise<ToolValidationResult>;
  execute(input: Input, context: ToolContext): Promise<ToolResult<Output>>;
};
```

This is the core type. Each tool defined in the system conforms to this interface:

- **`name`**: Unique identifier used by the LLM in tool calls and by the registry for lookup.
- **`description`**: Sent to the LLM to help it decide which tool to use.
- **`permissionLevel`**: Future-proofing for permission gating. Currently all tools are level 1 or 2, but the levels are defined:
  - Level 1: Read / create content (most tools).
  - Level 2: Delete content (`deleteCanvasItemTool`).
  - Level 3: Reserved for user-impacting actions.
  - Level 4: Reserved for admin/destructive actions.
- **`validate`**: Validates raw input from the LLM. Returns `ToolValidationResult`.
- **`execute`**: Performs the tool's action. Receives validated input plus `ToolContext`.

**Why separate `validate` and `execute`?** The registry calls `validate` first, then only calls `execute` if validation passes. This separation:
1. Makes validation logic testable independently.
2. Lets `validate` be shared (e.g., `validateCreateSubBoardInput` reuses `validateCreateBoardInput`).
3. Keeps `execute` clean — it assumes valid input.

## ToolRegistry Class

```tsx
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition) { ... }
  list() { ... }
  get(name: string) { ... }
  execute(name: string, input: unknown, context: ToolContext) { ... }
}
```

### `register(tool)` — Enforce Uniqueness

```tsx
register(tool: ToolDefinition) {
  if (this.tools.has(tool.name)) {
    throw new Error(`Tool already registered: ${tool.name}`);
  }
  this.tools.set(tool.name, tool);
}
```

Duplicate tool names throw immediately. This catches configuration errors at startup rather than during runtime, when duplicate tools would cause ambiguous tool calls.

### `list()` — Export for LLM

```tsx
list() {
  return [...this.tools.values()].map((tool) => ({
    description: tool.description,
    name: tool.name,
    permissionLevel: tool.permissionLevel,
  }));
}
```

Returns a summary of all registered tools. The chat route uses this to build the `tools` array sent to the LLM.

**Why not return the full ToolDefinition?** The full definition includes `validate` and `execute` functions, which shouldn't be serialized and sent to the LLM. The `list()` method returns only metadata.

### `get(name)` — Lookup

```tsx
get(name: string) {
  return this.tools.get(name);
}
```

Simple Map lookup. Used by the chat route to get the full tool definition when constructing LLM tool schemas with `getToolInputSchema`.

### `execute(name, input, context)` — Validated Execution

```tsx
async execute(name: string, input: unknown, context: ToolContext) {
  const tool = this.tools.get(name);

  if (!tool) {
    return { error: "Unknown tool.", ok: false, summary: "Tool was not found." };
  }

  const validation = await tool.validate(input);

  if (!validation.ok) {
    return { error: validation.error, ok: false, summary: "Tool input validation failed." };
  }

  return tool.execute(input, context);
}
```

Three-step process:
1. **Lookup**: Find the tool by name.
2. **Validate**: Run the tool's `validate` function.
3. **Execute**: If valid, run `execute`.

If any step fails, a `ToolResult` with `ok: false` is returned — never throws. This means the chat route can always safely call `registry.execute()` without try/catch.

**Why `await tool.validate(input)` — validation can be async?** Some tools might need to check database state during validation (e.g., "does this board exist?"). Making validation potentially async allows for that future use case. Currently all validations are synchronous, but the interface doesn't constrain them.

## Factory Function

```tsx
export function createToolRegistry() {
  return new ToolRegistry();
}
```

A simple factory. In the chat route, a fresh registry is created for each request:

```tsx
const registry = createToolRegistry();
registerBoardTools(registry);
registerBoardQueryTools(registry);
registerCanvasTools(registry);
registerTaskTools(registry);
```

**Why a fresh registry per request?** It avoids stale state. If tools were registered on a singleton registry, hot-reloading in development could leave old tool references. A per-request registry is trivially correct and has negligible overhead.

## Registration Pattern

Tool registration is done through dedicated `register*Tools` functions in each tool module:

```tsx
// board-tools.ts
export function registerBoardTools(registry: ToolRegistry) {
  registry.register(createBoardTool);
  registry.register(createSubBoardTool);
}

// canvas-tools.ts
export function registerCanvasTools(registry: ToolRegistry) {
  registry.register(addCanvasItemTool);
  registry.register(updateCanvasItemTool);
  registry.register(deleteCanvasItemTool);
}

// board-query-tools.ts
export function registerBoardQueryTools(registry: ToolRegistry) {
  registry.register(summarizeBoardTool);
  registry.register(listCanvasItemsTool);
}

// task-tools.ts
export function registerTaskTools(registry: ToolRegistry) {
  registry.register(createTaskTool);
  registry.register(listTasksTool);
  registry.register(createReminderTool);
  registry.register(listRemindersTool);
}
```

Each module owns its tools and provides a registration function. The chat route composes them by calling all registration functions.

**Why not auto-discovery (scanning files)?** Explicit registration is simpler and more maintainable. Auto-discovery would require naming conventions, directory scanning, and would be harder to debug. With explicit registration, you can see exactly which tools are available by reading the chat route.

## Total Tool Inventory

| Tool Name | Module | Permission |
|---|---|---|
| `create_board` | board-tools | 1 |
| `create_sub_board` | board-tools | 1 |
| `summarize_board` | board-query-tools | 1 |
| `list_canvas_items` | board-query-tools | 1 |
| `add_canvas_item` | canvas-tools | 1 |
| `update_canvas_item` | canvas-tools | 1 |
| `delete_canvas_item` | canvas-tools | 2 |
| `create_task` | task-tools | 1 |
| `list_tasks` | task-tools | 1 |
| `create_reminder` | task-tools | 1 |
| `list_reminders` | task-tools | 1 |

11 tools total across 4 modules.
