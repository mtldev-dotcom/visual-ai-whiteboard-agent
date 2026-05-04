# 38: Widget Data Model

**Source:** `prisma/schema.prisma` — WidgetDefinition, WidgetInstance, CustomHtmlWidgetSource (lines 89–147)

## Why These Models Exist

Widgets are the most complex objects in the whiteboard system. They need:
1. **A definition** (what kind of widget is this? what does it do?).
2. **An instance** (where is this widget on the board? what's its current state?).
3. **Source code** (for custom HTML widgets, the actual code that runs).

These three concerns are separated into three Prisma models to keep them independently versionable and manageable.

## WidgetDefinition — The Widget Type

```prisma
model WidgetDefinition {
  id              String   @id @default(cuid())
  key             String   @unique
  name            String
  description     String
  kind            String
  category        String
  version         String
  renderStrategy  String
  permissions     Json     @default("[]")
  stateSchema     Json     @default("{}")
  sourceVersioned Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  instances WidgetInstance[]
  sources   CustomHtmlWidgetSource[]
}
```

### Field-by-Field Explanation

| Field | Type | Purpose |
|---|---|---|
| `id` | cuid | Internal primary key |
| `key` | unique string | Machine-readable identifier (e.g., `"task_list"`, `"kanban"`) |
| `name` | string | Human-readable name (e.g., "Task List", "Kanban Board") |
| `description` | string | What this widget does, shown in the widget library |
| `kind` | string | Classification: `"native"` (prebuilt) or `"custom"` (user-generated) |
| `category` | string | Grouping in library UI (e.g., `"Productivity"`) |
| `version` | string | Semver-ish string (`"1.0.0"`), tracks definition changes |
| `renderStrategy` | string | How this widget renders: `"react_component"` or `"sandboxed_iframe"` |
| `permissions` | JSON array | Default permissions for instances of this widget |
| `stateSchema` | JSON object | JSON Schema describing valid instance state shape |
| `sourceVersioned` | boolean | Whether this widget stores versioned HTML/CSS/JS source |
| `createdAt` | datetime | When the definition was created |
| `updatedAt` | datetime | When the definition was last modified |

### renderStrategy: Two Approaches

**`react_component`** — The widget is a prebuilt React component shipped with the app. Examples:
- Task List widget: implemented as a React component with checkboxes.
- Kanban widget: implemented as a React component with columns.

These widgets have **full app context access** (they run in the same React tree). They're trusted because they're written by the development team, reviewed in PRs, and tested.

**`sandboxed_iframe`** — The widget renders inside a sandboxed iframe with `srcDoc` containing user-generated or assistant-generated HTML. Examples:
- A custom countdown timer widget.
- A habit tracker widget.
- An embedded mini-dashboard.

These widgets have **no app context access** by default. They run in isolation with `sandbox="allow-scripts"` only.

### permissions and stateSchema as JSON

Both are `Json` columns in PostgreSQL. **Why JSON instead of related tables?**

- `permissions` — The list is small (max 5 items) and always loaded with the definition. A join table adds query complexity without benefit for such small data.
- `stateSchema` — JSON Schema documents are hierarchical and would be awkward to store in relational columns. They're used for validation at runtime, not for querying.

```typescript
// Example permissions value:
["board.read", "storage.local"]

// Example stateSchema value:
{
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" },
          "done": { "type": "boolean" }
        }
      }
    }
  }
}
```

### Indexes

```
@@index([kind])      —  Filter widgets by native vs. custom
@@index([category])  —  Group widgets in the library view
```

These indexes support the Widget Library UI which filters and groups by these fields.

## WidgetInstance — A Widget on a Board

```prisma
model WidgetInstance {
  id                 String   @id @default(cuid())
  workspaceId        String
  boardId            String?
  canvasItemId       String?
  widgetDefinitionId String
  state              Json     @default("{}")
  permissions        Json     @default("[]")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  workspace        Workspace        @relation(...)
  board            Board?           @relation(...)
  widgetDefinition WidgetDefinition @relation(...)
}
```

### Field-by-Field Explanation

| Field | Type | Purpose |
|---|---|---|
| `id` | cuid | Internal primary key |
| `workspaceId` | FK | Which workspace owns this instance |
| `boardId` | FK (optional) | Which board this widget is on |
| `canvasItemId` | FK (optional) | Which canvas item this widget is linked to |
| `widgetDefinitionId` | FK | Which widget type this instance is |
| `state` | JSON | The widget's current runtime state |
| `permissions` | JSON | Instance-specific permission overrides |

### Why State Is Separate from the Definition

The definition has `stateSchema` (the shape of valid state). The instance has `state` (the actual values).

```typescript
// Definition stateSchema:
{ "properties": { "title": { "type": "string" } } }

// Instance state:
{ "title": "Sprint 23 Tasks" }
```

This separation means:
1. One definition serves many instances (no duplication).
2. Changing the definition schema doesn't overwrite instance data.
3. Instance state can be queried independently.
4. State can be reset to defaults without touching the definition.

### Why canvasItemId Is Separate

A widget instance is linked to a canvas item, not the same thing. The canvas item stores:
- Position (x, y)
- Size (width, height)
- Visual style

The widget instance stores:
- State
- Permissions

This means a widget could theoretically be moved between canvas items (changing position/size without losing state), or a canvas item could change its widget type (keeping position but resetting state).

### Optional boardId and canvasItemId

Both are nullable. This allows:
- **boardId null** — Widgets not yet placed on a board (workspace-level widgets like a global task inbox).
- **canvasItemId null** — Widget instances created but not yet rendered as canvas items (e.g., after creation, before placement).

### Relations

```prisma
workspace        Workspace        @relation(onDelete: Cascade)   // Delete instance when workspace is deleted
board            Board?           @relation(onDelete: Cascade)   // Delete instance when board is deleted
widgetDefinition WidgetDefinition @relation(onDelete: Restrict)   // CANNOT delete definition if instances exist
```

`onDelete: Restrict` on WidgetDefinition is critical: you cannot delete a widget definition while instances of that widget exist. This prevents orphaned instances with dangling references. You must delete all instances first.

## CustomHtmlWidgetSource — The Widget's Executable Code

```prisma
model CustomHtmlWidgetSource {
  id                 String    @id @default(cuid())
  widgetDefinitionId String
  version            String
  html               String
  css                String?
  js                 String?
  createdBy          String
  riskLevel          String    @default("low")
  approvedAt         DateTime?
  createdAt          DateTime  @default(now())

  widgetDefinition WidgetDefinition @relation(onDelete: Cascade)

  @@unique([widgetDefinitionId, version])
}
```

### Field-by-Field Explanation

| Field | Type | Purpose |
|---|---|---|
| `id` | cuid | Internal primary key |
| `widgetDefinitionId` | FK | Which definition this source belongs to |
| `version` | string | Version identifier (e.g., `"1.0.0"`, `"2024-03-15-a"`) |
| `html` | string | HTML source (required) |
| `css` | string? | CSS styles (optional) |
| `js` | string? | JavaScript logic (optional) |
| `createdBy` | string | Who created this version (`"user"` or `"assistant"`) |
| `riskLevel` | string | Security risk assessment: `"low"`, `"medium"`, `"high"` |
| `approvedAt` | datetime? | When an admin or user approved this version |

### Why Source Is Separated from Instance State

This is the most important design decision in the widget model:

```
WidgetDefinition  — "What kind of widget is this?"
WidgetInstance    — "What is this widget's current state?"
CustomHtmlWidgetSource  — "What code does this widget run?"
```

**Reasons for separation:**

1. **Versioning** — A widget might have version 1.0 (basic HTML) and version 2.0 (added JS). Instances can reference which version they use, and old instances can keep running old versions.

2. **Safety review** — Source versions can be reviewed and approved independently of instance creation. The `approvedAt` field allows an approval workflow: generate source → review → approve → instances can use it.

3. **Size efficiency** — The HTML source might be large (thousands of characters). Including it in every WidgetInstance row would bloat queries. Keeping it separate means instance queries (list all widgets on a board) are fast.

4. **Reuse** — Multiple instances can share the same source version. Changing the source updates all instances using that version.

### Unique Constraint on (widgetDefinitionId, version)

```prisma
@@unique([widgetDefinitionId, version])
```

A widget definition can only have one source per version. This prevents accidental duplicates and makes version lookup unambiguous.

### riskLevel Values

| Level | Meaning | Example |
|---|---|---|
| `"low"` | Static HTML, no JS, no external resources | A styled text display |
| `"medium"` | JS with DOM manipulation, no network | A countdown timer with intervals |
| `"high"` | JS with potential network requests or complex logic | A mini-dashboard with fetch calls |

The `riskLevel` determines:
1. Whether the user sees a confirmation dialog before running.
2. What `sandbox` attributes are applied to the iframe.
3. Whether admin approval is required.

### Index on riskLevel

```
@@index([riskLevel])
```

Supports queries like "show me all high-risk widget sources pending approval."

## Model Relationships Diagram

```text
WidgetDefinition (1) ─────────── (N) WidgetInstance
       │                                    │
       │ (1)                                │ (N)
       │                                    │
       └────────── (N) CustomHtmlWidgetSource
```

- One definition → many instances (e.g., "Task List" on 5 different boards).
- One definition → many source versions (e.g., "Custom Timer" v1.0, v1.1, v2.0).
- One instance → one definition (each instance has exactly one widget type).

## Separation of CanvasItem and WidgetInstance

A widget on screen involves three database rows:

```
CanvasItem (position, size, type)
    │
    └── WidgetInstance (state, permissions)
               │
               └── WidgetDefinition (name, render strategy)
                         │
                         └── CustomHtmlWidgetSource (html, css, js) [if sandboxed_iframe]
```

This multi-row design seems complex but solves real problems:
- You can resize a widget without touching its state.
- You can change widget state without touching its position.
- You can update widget source code independently.
- You can swap a widget's type while keeping position (e.g., upgrade "Basic Task List" to "Kanban").

## Summary of Design Principles

1. **Definition vs. Instance** — Separate the "what" from the "where."
2. **Source vs. State** — Separate the executable code from runtime data.
3. **JSON for flexible data** — Permissions arrays and state objects are JSON because they're heterogenous and don't need relational queries.
4. **Cascade safety** — Deleting a workspace cleans up child widgets; deleting a definition fails if instances exist.
5. **Risk classification** — Every custom source has a risk level that drives safety behavior.
