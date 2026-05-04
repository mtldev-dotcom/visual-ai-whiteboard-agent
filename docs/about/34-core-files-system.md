# 34: Core Files System

**Source:** `src/server/core-files.ts` (86 lines)

## Why This Exists

The assistant is not a generic chatbot. Its behavior is defined by a set of markdown "core files" stored in `docs/agent-core/`. These files act as the assistant's operating system — they define its mission, personality, tool knowledge, safety rules, memory, and board conventions.

`core-files.ts` is the server-side module that reads, writes, and validates access to these files. It ensures that:
1. Only known files can be accessed (type safety and path traversal prevention).
2. File content has a size limit (prevents memory exhaustion).
3. The assistant context subset can be loaded efficiently for every LLM call.

## The 8 Core File Names

```typescript
export const CORE_FILE_NAMES = [
  "CORE.md",
  "ASSISTANT.md",
  "TOOLS.md",
  "SKILLS.md",
  "RULES.md",
  "MEMORY.md",
  "BOARDS.md",
  "USER_TEMPLATE.md",
] as const;

export type CoreFileName = (typeof CORE_FILE_NAMES)[number];
```

Each name is a string literal type, not just `string`. This enables TypeScript to enforce that only valid file names are passed to functions like `readCoreFile`.

| File | Role |
|---|---|
| `CORE.md` | Assistant mission, core behavior principles |
| `ASSISTANT.md` | Personality, response style, tool messaging tone |
| `TOOLS.md` | Available tools and Telegram commands (must match reality) |
| `SKILLS.md` | Skill categories (diagram maker, organizer, HTML builder, etc.) |
| `RULES.md` | Safety, permissions, audit, confirmation, data integrity |
| `MEMORY.md` | Cross-session memory rules |
| `BOARDS.md` | Board organization conventions |
| `USER_TEMPLATE.md` | User profile and onboarding context template |

## The Assistant Context Subset

Not all 8 files go into every LLM call. Only the first 5 are needed for operational context:

```typescript
export const ASSISTANT_CONTEXT_CORE_FILE_NAMES = [
  "CORE.md",
  "ASSISTANT.md",
  "TOOLS.md",
  "SKILLS.md",
  "RULES.md",
] as const satisfies readonly CoreFileName[];
```

The `satisfies readonly CoreFileName[]` constraint ensures these are valid core file names at compile time — if a name is mistyped, TypeScript catches it.

`MEMORY.md`, `BOARDS.md`, and `USER_TEMPLATE.md` are excluded from the LLM context bundle because:
- `MEMORY.md` is session-specific and may be large.
- `BOARDS.md` is structural convention, not behavioral.
- `USER_TEMPLATE.md` is a template, not runtime instruction.

## The CoreFile Type

```typescript
export type CoreFile = {
  name: CoreFileName;
  content: string;
};
```

A simple name-content pair. Every function that reads core files returns this shape. Every function that accepts core files expects this shape.

## Constants

```typescript
const CORE_FILES_DIRECTORY = path.join(process.cwd(), "docs", "agent-core");
const MAX_CORE_FILE_BYTES = 200_000;
```

- `CORE_FILES_DIRECTORY` resolves relative to the project root, so it works regardless of where the process is started from.
- `MAX_CORE_FILE_BYTES` is 200 KB. This is large enough for detailed instructions but prevents a single core file from consuming massive LLM context windows.

## Functions

### isCoreFileName — Type Guard

```typescript
export function isCoreFileName(name: string): name is CoreFileName {
  return CORE_FILE_NAMES.includes(name as CoreFileName);
}
```

This is a TypeScript type guard. When it returns `true`, TypeScript narrows the argument to `CoreFileName`. However, note the cast `as CoreFileName` — this is safe because `CORE_FILE_NAMES` contains only known values, but it means the function doesn't validate against untrusted input at runtime (that happens in `getCoreFilePath`).

### getCoreFilePath — Path Validation and Traversal Prevention

```typescript
export function getCoreFilePath(name: string): string {
  if (!isCoreFileName(name)) {
    throw new Error(`Unsupported core file: ${name}`);
  }

  const filePath = path.resolve(CORE_FILES_DIRECTORY, name);
  const coreDirectory = path.resolve(CORE_FILES_DIRECTORY);

  if (!filePath.startsWith(`${coreDirectory}${path.sep}`)) {
    throw new Error(`Unsupported core file path: ${name}`);
  }

  return filePath;
}
```

**Why the double check?** After `isCoreFileName` verifies the name is one of the 8 known values, `path.resolve` could theoretically produce a path outside the core directory if `name` contained `..` segments (symlink edge cases on some filesystems). The second check ensures the resolved path actually starts with the core directory + path separator. This is defense-in-depth against path traversal even though the type guard should already reject malicious names.

The check uses `` `${coreDirectory}${path.sep}` `` rather than just `coreDirectory` to prevent matching `/path/to/core-files-evil/` as if it were `/path/to/core-files/`.

### readCoreFile

```typescript
export async function readCoreFile(name: CoreFileName): Promise<CoreFile> {
  return {
    content: await readFile(getCoreFilePath(name), "utf8"),
    name,
  };
}
```

Takes a typed `CoreFileName`, resolves the path, reads the file as UTF-8. Returns a `CoreFile`. The parameter type `CoreFileName` means callers must pass a literal from the union — TypeScript won't accept arbitrary strings.

### listCoreFiles

```typescript
export async function listCoreFiles(): Promise<CoreFile[]> {
  return Promise.all(CORE_FILE_NAMES.map((name) => readCoreFile(name)));
}
```

Reads all 8 core files in parallel via `Promise.all`. Used by the `/core` page to display all files at once. If any file is missing, this throws — there's no graceful degradation.

### writeCoreFile

```typescript
export async function writeCoreFile(
  name: string,
  content: string,
): Promise<void> {
  if (Buffer.byteLength(content, "utf8") > MAX_CORE_FILE_BYTES) {
    throw new Error("Core file content is too large.");
  }

  await writeFile(getCoreFilePath(name), content, "utf8");
}
```

**Why `Buffer.byteLength` instead of `content.length`?** JavaScript's `.length` counts UTF-16 code units, not bytes. A character like `🚀` is `.length === 2` but uses 4 UTF-8 bytes. `Buffer.byteLength(content, "utf8")` accurately measures the byte size. This matters because:
1. LLM context windows are measured in tokens/bytes, not JS string length.
2. Storage and network transmission costs are in bytes.

Note that `name` is typed as `string` (not `CoreFileName`) here, because the caller might pass user input. The validation happens in `getCoreFilePath` which `writeFile` calls internally.

### formatCoreFilesForAssistantContext

```typescript
export function formatCoreFilesForAssistantContext(files: CoreFile[]): string {
  return files
    .map((file) => `--- ${file.name} ---\n${file.content.trim()}`)
    .join("\n\n");
}
```

Joins multiple core files into a single string suitable for injection into an LLM system message. Each file is wrapped in a `--- FILENAME ---` header, content is trimmed, and files are separated by double newlines. This format makes it easy for the LLM to parse individual file boundaries.

**Why trim?** Leading/trailing whitespace in markdown files is usually accidental and wastes context window tokens.

### loadAssistantCoreContext

```typescript
export async function loadAssistantCoreContext(): Promise<string> {
  const files = await Promise.all(
    ASSISTANT_CONTEXT_CORE_FILE_NAMES.map((name) => readCoreFile(name)),
  );

  return formatCoreFilesForAssistantContext(files);
}
```

The top-level function that everything calls. It:
1. Reads only the 5 context files (not all 8).
2. Formats them into a single string.
3. Returns the result — ready to be injected into a system prompt.

## Integration Points

### /core Page
The `/core` route uses `listCoreFiles()` to display all 8 files in an editable markdown viewer. Users can edit these files to customize assistant behavior. Save calls `writeCoreFile` with validation.

### LLM System Message
Every LLM call in the app calls `loadAssistantCoreContext()` and injects the result as part of the system message. This ensures the assistant always "knows" its mission, personality, tools, skills, and rules before processing user input.

### Scheduled Updates
If core files change (via the /core page), the next LLM call automatically picks up the new content — no restart required. The files are read from disk on every LLM call.

## Security Model

1. **Whitelist, not blacklist** — Only 8 explicitly named files can be accessed. No wildcard or directory listing.
2. **Path traversal prevention** — Even with a valid name, the resolved path is verified to stay within the core directory.
3. **Size limit** — 200 KB per file prevents memory/context exhaustion.
4. **No file creation** — `writeCoreFile` can only update existing core files. It cannot create new ones because `getCoreFilePath` rejects unknown names.
5. **UTF-8 only** — Files are read and written as UTF-8. No binary, no encoding tricks.

## Design Decisions

**Why files on disk instead of database rows?**
- Git-versioned: changes to assistant behavior are tracked in version control.
- Human-editable: users can edit files with any text editor.
- Simple: no DB migration needed for new file content.
- LLM-native: markdown files are the most natural format for LLM context injection.

**Why `as const` on both lists?**
- `CORE_FILE_NAMES` uses `as const` to make each element a literal type.
- `ASSISTANT_CONTEXT_CORE_FILE_NAMES` adds `satisfies readonly CoreFileName[]` to ensure every entry is a valid core file name while keeping the literal types.

**Why not a database-backed config system?**
The current scope is 8 files, all small. A database adds complexity without benefit. If the system grows to hundreds of files or per-user customization, a database migration would make more sense.
