# Test Infrastructure

## Vitest Configuration

The project uses [Vitest](https://vitest.dev) (`vitest.config.ts`) as its test runner. The configuration is minimal and intentional:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

### Why Vitest

Vitest was chosen over Jest for three reasons:

1. **Native ESM support.** Vitest resolves imports the same way the application does, avoiding the dual-module-system problems that Jest often creates in Next.js projects.
2. **Faster startup.** Vitest uses esbuild for transforms and runs tests in worker threads, making `npm test` feel instant on a project of this size.
3. **Compatibility with Vite-based builds.** Next.js 16 uses Turbopack, which shares resolution logic with Vite. Vitest's resolver mirrors this, so path aliases and module boundary rules match production behavior.

## The `@` Alias

The most important line in `vitest.config.ts` is the `resolve.alias` mapping:

```
"@": "./src"
```

This mirrors the `paths` entry in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Without this alias in both places, tests would not be able to import application modules using the same `@/` prefix that source files use. Every test file imports via `@/`:

```ts
import { validateAddCanvasItemInput } from "@/server/assistant/canvas-tools";
import { createToolRegistry } from "@/server/assistant/tools";
import { requireSession } from "@/lib/session";
```

The alias is resolved at two levels:
- **TypeScript** (`tsconfig.json`): resolves for editor intellisense and `tsc --noEmit`.
- **Vitest** (`vitest.config.ts`): resolves at runtime during test execution.

If one exists without the other, imports will break in one environment but not the other — a frustrating class of bug. Both files are kept in sync as a deliberate pair.

## Test File Convention

Test files are **co-located** with the source files they test, using the `.test.ts` (or `.test.tsx`) suffix:

```
src/
  server/
    assistant/
      canvas-tools.ts
      canvas-tools.test.ts        ← test lives next to source
      board-tools.ts
      board-tools.test.ts
      board-query-tools.ts
      board-query-tools.test.ts
      llm.ts
      llm.test.ts
      tools.ts
      tools.test.ts
    telegram/
      account-linking.ts
      account-linking.test.ts
      commands.ts
      commands.test.ts
    widgets/
      permissions.ts
      permissions.test.ts
    core-files.ts
    core-files.test.ts
  lib/
    signup.ts
    signup.test.ts
```

### Why Co-location

Co-location keeps the test close to the implementation it validates. When a developer reads `canvas-tools.ts`, the test file is one directory listing away. When a function signature changes, the test breaks in a file that is obviously related. This pattern is especially valuable in a multi-agent project where different contributors might touch different server modules — each module's tests travel with it.

The alternative — a separate `tests/` or `__tests__/` directory — would require maintaining a parallel folder structure that mirrors `src/`. Co-location eliminates that duplication.

Co-location also means that deleting a feature module automatically deletes its tests. There is no orphaned test file left behind in a distant directory.

## Running Tests

Tests are run with:

```bash
npm test
```

which executes:

```bash
vitest run --passWithNoTests
```

- `vitest run`: runs tests once and exits (not watch mode). In CI or agent workflows, a single-run command is easier to script.
- `--passWithNoTests`: prevents Vitest from exiting with code 1 when no test files match. This is useful during early-stage development when some modules exist but their test files haven't been written yet.

### Watch Mode

For interactive development, use:

```bash
npx vitest
```

This starts Vitest in watch mode, re-running affected tests on file changes. This is the standard development workflow for TDD or rapid iteration.

## Test Architecture Patterns

### Pattern 1: In-Memory Unit Testing (No Database)

The majority of tests are pure unit tests that validate logic without touching the database. This is the preferred pattern for input validation, tool registry operations, content summarization, and LLM adapter behavior.

```ts
// canvas-tools.test.ts — pure validation, no DB
it("rejects missing board id", () => {
  expect(validateAddCanvasItemInput({ ...validInput, boardId: "" })).toEqual({
    error: "boardId is required.",
    ok: false,
  });
});
```

**Why:** Unit tests without database dependencies are fast, deterministic, and never leave behind stale test data. They can run in any order and in parallel. Every validation function is tested this way.

### Pattern 2: Mock Patterns for Database Calls

When a test must exercise code that calls the database, the database is mocked rather than requiring a live Postgres connection:

```ts
// Example pattern (used in tools.ts execution flow)
const mockDb = {
  boards: {
    findById: vi.fn().mockResolvedValue({ id: "board-1", workspaceId: "ws-1" }),
  },
};
```

**Why:** Mocking keeps tests fast and avoids the complexity of test database fixtures, migrations, and teardown. Tool execution tests verify that the correct DB helpers are called with the correct arguments, without actually needing Postgres.

Tests that require real database verification (connection, migration, query correctness) are handled by `scripts/db-smoke.ts` rather than the Vitest suite.

### Pattern 3: Tool Validation Tests

Every assistant tool exposes a `validate` function. These validation functions are tested exhaustively:

```ts
describe("validateAddCanvasItemInput", () => {
  const validInput = {
    boardId: "board-1",
    content: { text: "Hello" },
    height: 120,
    type: "sticky_note",
    width: 200,
    x: 10,
    y: 20,
  };

  it("accepts valid canvas item input", () => { /* ... */ });
  it("rejects missing board id", () => { /* ... */ });
  it("rejects invalid geometry", () => { /* ... */ });
  it("rejects invalid content", () => { /* ... */ });
  it("rejects removed notes item type", () => { /* ... */ });
});
```

**Why:** Input validation is the first line of defense against malformed AI tool calls. An LLM might hallucinate a `type: "notes"` or send `content` as a string instead of an object. Each rejection case is tested explicitly so that validation failures produce clear, structured error messages that the assistant can respond to.

### Pattern 4: Tool Execution Tests

Tool execution is tested through the registry pattern, which provides a clean interface for testing the full lifecycle — validation, execution, and response formatting:

```ts
it("registers, lists, and executes a tool", async () => {
  const registry = createToolRegistry();
  registry.register({ /* tool definition */ });
  expect(registry.list()).toEqual([/* expected list */]);
  await expect(
    registry.execute("echo", { text: "hi" }, context)
  ).resolves.toEqual({
    ok: true,
    output: { text: "hi" },
    summary: "Echoed input.",
  });
});
```

**Why:** Tool execution through the registry is the actual code path that the chat route uses. Testing through the registry validates the complete integration of validation → execution → response without needing to mock the entire HTTP layer.

### Pattern 5: Type Safety

All test files use the same strict TypeScript rules as source files. Tests are compiled during `tsc --noEmit` (`npm run typecheck`). This catches type mismatches between test expectations and actual return types:

```ts
// If tool.type changes, this assertion catches the mismatch at compile time
expect(registry.list()).toEqual([
  {
    description: "Echo input",
    name: "echo",
    permissionLevel: 1,
  },
]);
```

**Why:** Tests that pass at runtime but have incorrect types are a common source of false confidence. Running `typecheck` over test files ensures that mock objects, assertions, and return values match the source types exactly.

## Test Directory Inventory

The full test suite contains **58 tests** across these files:

| Test file | What it tests | Test count |
|---|---|---|
| `src/server/assistant/canvas-tools.test.ts` | `add_canvas_item`, `update_canvas_item`, `delete_canvas_item` input validation | 10 |
| `src/server/assistant/board-tools.test.ts` | `create_board`, `create_sub_board` input validation | 6 |
| `src/server/assistant/board-query-tools.test.ts` | `summarize_board`, `list_canvas_items`, content summarization | 4 |
| `src/server/assistant/tools.test.ts` | Tool registry (register, list, execute, duplicate rejection, error handling) | 5 |
| `src/server/assistant/llm.test.ts` | LLM adapter (local provider, core context injection, unsupported provider) | 3 |
| `src/lib/signup.test.ts` | Signup validation and bcrypt flows | 5 |
| `src/server/core-files.test.ts` | Core file loading and parsing | 5 |
| `src/server/widgets/permissions.test.ts` | Widget permission model validation | 10 |
| `src/server/telegram/account-linking.test.ts` | Telegram account-linking token generation and consumption | 5 |
| `src/server/telegram/commands.test.ts` | Telegram command parsing and dispatch | 5 |

**Total: 58 tests, all passing.**

## What Is NOT Tested (Yet)

These areas intentionally lack unit tests and rely on other mechanisms:

- **React components.** Components like `BoardCanvas.tsx` and `AssistantPanel.tsx` do not have Vitest tests. Their behavior is verified through TypeScript compilation and manual QA. Setting up React Testing Library with the full Next.js context (auth providers, router, canvas state) adds complexity that has not yet been justified for MVP.
- **API route handlers.** `src/app/api/chat/route.ts` and similar route files are not unit-tested. The tool execution loop is tested at the registry level, and the HTTP surface is verified through manual QA.
- **Prisma queries.** Database helper functions in `src/db/` are not individually tested. Their schemas are validated by `prisma validate`, and connectivity is verified by `db:smoke`.

## Adding a New Test

When adding a new feature, follow this checklist:

1. **Create the test file** next to the source file: `<feature>.test.ts`.
2. **Add validation tests** for every rejection path in the validation function.
3. **Add execution tests** if the feature registers a tool in the registry.
4. **Mock the database** rather than requiring a real connection.
5. **Run `npm test`** to confirm the test passes.
6. **Run `npm run typecheck`** to confirm types are correct.
7. **Run `npm run lint`** to confirm code style.

## Continuous Integration Considerations

The current test suite is designed to run in CI with zero external dependencies. All tests are in-memory, so CI only needs:

```bash
npm ci
npm test
npm run typecheck
npm run lint
```

No Postgres container, no Redis, no file system setup. This keeps CI fast and reliable.
