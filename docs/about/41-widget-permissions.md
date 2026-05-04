# 41: Widget Permissions

**Source:** `src/server/widgets/permissions.ts` (52 lines)

## Why This Module Exists

Widgets operate on a spectrum from fully trusted (prebuilt React components) to fully untrusted (generated HTML in sandboxed iframes). The permissions module defines:

1. **What permissions exist** — The vocabulary of widget capabilities.
2. **How permissions are validated** — Prevents invalid or duplicate permissions from being stored.
3. **What defaults apply** — Custom HTML widgets start with zero permissions.
4. **How to check permissions at runtime** — Before executing a widget operation, verify the widget has the right permission.

This module is the server-side authority on widget permissions. Client-side components consult it for permission display and gating, but the enforcement happens here.

## The Permission Vocabulary

```typescript
export const widgetPermissions = [
  "board.read",
  "board.write",
  "network.request",
  "storage.local",
  "tools.invoke",
] as const;

export type WidgetPermission = (typeof widgetPermissions)[number];
```

### The Five Permissions

| Permission | What It Allows | Risk Level | Default for Custom HTML |
|---|---|---|---|
| `board.read` | Read board state (canvas items, titles, metadata) | Low | ❌ |
| `board.write` | Create, update, or delete canvas items | High | ❌ |
| `network.request` | Make HTTP requests to external URLs | High | ❌ |
| `storage.local` | Use localStorage/IndexedDB within the widget | Medium | ❌ |
| `tools.invoke` | Call assistant tools (create board, summarize, etc.) | Critical | ❌ |

### Permission Granularity

Permissions are intentionally coarse-grained. There is no:
- `board.read.own_board_only` vs. `board.read.all_boards`
- `network.request.approved_domains_only`
- `storage.local.max_50mb`

This is an MVP permissions model. Fine-grained permissions (domain allowlists, rate limits, data caps) belong in a future authorization layer. The current model answers one question: "Can this widget do X?" with a simple yes/no.

### Why `as const`

```typescript
export const widgetPermissions = [
  "board.read",
  "board.write",
  "network.request",
  "storage.local",
  "tools.invoke",
] as const;
```

Without `as const`, TypeScript infers the type as `string[]`. With `as const`, it infers the exact tuple type `readonly ["board.read", "board.write", "network.request", "storage.local", "tools.invoke"]`. This enables:
- `WidgetPermission` to be a union of literal string types, not just `string`.
- Functions to accept `WidgetPermission` and get autocomplete for the 5 values.
- TypeScript to catch typos like `"board.writte"` at compile time.

## Default Permissions for Custom HTML Widgets

```typescript
export const defaultCustomHtmlWidgetPermissions: WidgetPermission[] = [];
```

An empty array. Custom HTML widgets start with **zero permissions**. They cannot read boards, write to boards, make network requests, use local storage, or invoke tools.

**Why zero?** The principle of least privilege. Generated code is untrusted by default. Permissions are added:
1. By the user, through a permission configuration UI (future).
2. By explicit approval workflows for `network.request` and `tools.invoke`.
3. Never automatically, even if the generator (assistant) requests them.

Contrast with prebuilt widgets (Task List, Kanban), which implicitly have `board.read` and `board.write` because they're React components running in the same origin with full app access.

## Validation Functions

### isWidgetPermission — Type Guard

```typescript
export function isWidgetPermission(input: unknown): input is WidgetPermission {
  return typeof input === "string" && widgetPermissionSet.has(input);
}
```

This function:
1. Checks if `input` is a string.
2. Checks if it's in the set of known permissions.
3. Returns a type guard — when `true`, TypeScript narrows `input` to `WidgetPermission`.

**Why `unknown` instead of `string`?** The input comes from potentially untrusted sources (API requests, database JSON parsing). `unknown` forces the caller to check the type before using the value, which `isWidgetPermission` does.

**Why a Set for lookup?**
```typescript
const widgetPermissionSet = new Set<string>(widgetPermissions);
```
`Set.has()` is O(1), while `Array.includes()` is O(n). For 5 elements, the difference is negligible, but the pattern scales if permissions grow.

### validateWidgetPermissions — Batch Validation

```typescript
export function validateWidgetPermissions(input: unknown) {
  if (!Array.isArray(input)) {
    return { error: "permissions must be an array.", ok: false } as const;
  }

  const seen = new Set<string>();

  for (const permission of input) {
    if (!isWidgetPermission(permission)) {
      return {
        error: `Unsupported widget permission: ${String(permission)}`,
        ok: false,
      } as const;
    }

    if (seen.has(permission)) {
      return {
        error: `Duplicate widget permission: ${permission}`,
        ok: false,
      } as const;
    }

    seen.add(permission);
  }

  return { ok: true, permissions: input } as const;
}
```

#### Return Type: Discriminated Union

```typescript
{ ok: true, permissions: unknown[] } | { ok: false, error: string }
```

This is a discriminated union on `ok`. The caller checks `result.ok` and TypeScript narrows the result:
- If `ok: true`, `result.permissions` exists.
- If `ok: false`, `result.error` exists and `result.permissions` doesn't.

This pattern (popular in Rust and Go) avoids try/catch for validation errors and forces callers to handle both cases.

#### Validation Steps

1. **Is it an array?** Reject `null`, `"board.read"` (string), `{}` (object).
2. **Is each element a known permission?** Reject unknown strings like `"admin.sudo"`.
3. **Are there duplicates?** Reject `["board.read", "board.read"]`.

#### Duplicate Detection

```typescript
const seen = new Set<string>();
```

A Set tracks which permissions have been seen. Duplicates are rejected because they indicate either a programming error or an attempt to bypass validation by repeating a permission that was rejected earlier.

#### Error Messages

- `"permissions must be an array."` — Wrong type.
- `"Unsupported widget permission: ${value}"` — Invalid permission name.
- `"Duplicate widget permission: ${value}"` — Repeated permission.

Messages are designed to be user-facing (shown in UI if validation fails during an API call) but are also specific enough for debugging.

### hasWidgetPermission — Runtime Check

```typescript
export function hasWidgetPermission(
  permissions: readonly WidgetPermission[],
  permission: WidgetPermission,
) {
  return permissions.includes(permission);
}
```

Simple `Array.includes()` check. This is used at runtime when a widget tries to perform an operation:

```typescript
// Hypothetical usage in a widget action handler:
async function handleWidgetAction(instance: WidgetInstance, action: string) {
  const perms = instance.permissions as WidgetPermission[];
  
  if (action === "write" && !hasWidgetPermission(perms, "board.write")) {
    throw new Error("Widget does not have board.write permission.");
  }
  
  // ... perform the write
}
```

The function accepts `readonly WidgetPermission[]` (not `WidgetPermission[]`) to indicate it won't modify the array. This is good practice for pure query functions.

## Permission Checking Flow

```
User creates/edits a widget instance
         │
         ▼
API receives permissions array in request body
         │
         ▼
validateWidgetPermissions(permissions)
         │
    ┌────┴────┐
    │ ok: false│ → Return 400 with error message
    └─────────┘
    │ ok: true
    ▼
Store permissions in WidgetInstance.permissions (JSON column)
         │
         ▼
Widget renders in iframe
         │
         ▼
Widget attempts operation (e.g., postMessage to parent)
         │
         ▼
Parent checks: hasWidgetPermission(instance.permissions, "board.write")
         │
    ┌────┴────┐
    │ false    │ → Ignore message, log security event
    └─────────┘
    │ true
    ▼
Execute operation, record audit event
```

## Permission Lifecycle

### Creation: Zero Defaults
```typescript
// New custom HTML widget instance:
const instance = await prisma.widgetInstance.create({
  data: {
    permissions: [], // defaultCustomHtmlWidgetPermissions
    // ...
  },
});
```

### Modification: Explicit Grant
```typescript
// User (or admin) adds permissions:
const result = validateWidgetPermissions(["board.read", "storage.local"]);
if (result.ok) {
  await prisma.widgetInstance.update({
    where: { id: instanceId },
    data: { permissions: result.permissions },
  });
}
```

### Runtime Enforcement
Every widget operation that touches a permission-gated capability must call `hasWidgetPermission` before proceeding.

## Render Strategy Determines Permission Baseline

| Render Strategy | Default Permissions | How Permissions Are Enforced |
|---|---|---|
| `react_component` | Implicit full app access | Code review (trusted code) |
| `sandboxed_iframe` | Empty (`[]`) | Browser sandbox + permission checks |

React components don't go through this permissions module because they're trusted code running in the same JS context. They have access to everything by virtue of being part of the app's source.

Sandboxed iframe widgets have no access by default. Even if `permissions` includes `board.read`, the iframe can't access the board directly — it would need a postMessage bridge that the parent app controls. Permissions are a **declaration of intent** that the infrastructure enforces, not a direct capability grant.

### The PostMessage Bridge (Future)

When `tools.invoke` or `board.write` are granted, a postMessage API bridge would be implemented:

```typescript
// Inside the iframe (widget code generated by assistant):
parent.postMessage({ type: "tool_call", tool: "create_board", args: { title: "New Board" } }, "*");

// In the parent app:
window.addEventListener("message", (event) => {
  if (!hasWidgetPermission(widgetInstance.permissions, "tools.invoke")) {
    return; // Silently ignore
  }
  // Validate, audit, execute
});
```

Without this bridge, even granted permissions have no effect. The permissions module defines the vocabulary; the bridge would provide the transport.

## Security Considerations

### Permission Escalation Prevention

- `validateWidgetPermissions` rejects unknown permission names — no way to invent a super-permission.
- Duplicate detection prevents bypass via repetition.
- The type system (`WidgetPermission` union) prevents compile-time typos in permission names.
- Defaults are zero — escalation requires explicit action.

### Audit Trail

When permissions change, an audit event should be recorded:

```typescript
await recordAuditEvent({
  action: "widget.permissions_changed",
  actorId: userId,
  actorType: "user",
  metadata: { previous: oldPermissions, next: newPermissions },
  summary: `User changed widget permissions from [${old}] to [${new}]`,
  targetId: instanceId,
  targetType: "WidgetInstance",
  workspaceId,
});
```

This creates a permanent record of who granted what permissions to which widget, when.

### Network Request Permission

`network.request` is the riskiest permission after `tools.invoke`. If granted, a widget could:
- Send user board data to an external server.
- Load malicious scripts from external URLs.
- Participate in DDoS attacks.

For this permission, additional safeguards would be needed:
1. User confirmation dialog showing the exact permission being granted.
2. Domain allowlist (only approved URLs can be fetched).
3. Rate limiting (max N requests per minute).
4. Content security policy (CSP) restricting allowed origins.

These are not implemented in the permissions module itself but would be layered on top when `network.request` becomes available.

## Summary of Design Principles

1. **Default-deny** — Custom widgets start with zero permissions.
2. **Explicit vocabulary** — Only 5 named permissions exist; no ad-hoc strings.
3. **Validation at input** — Permissions are validated when stored, not just when used.
4. **Type safety** — TypeScript union type prevents typos and enables autocomplete.
5. **Separation of declaration and enforcement** — Permissions declare intent; infrastructure (sandbox, postMessage gate) enforces it.
6. **Coarse-grained for MVP** — Simple yes/no permissions; fine-grained control comes later.
