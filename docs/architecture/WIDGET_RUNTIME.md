# Widget Runtime

## Widget types

### Prebuilt widgets

Trusted widgets shipped with the app.

Examples:

- Task list.
- Kanban.
- Notes.
- Markdown reader.
- Rich text editor.
- Reminders.
- Finance tracker.
- CRM.
- Project manager.
- Habit tracker.

### Custom HTML widgets

Generated or user-provided HTML/CSS/JS rendered inside a sandboxed iframe.

## Widget manifest

Widget manifests are defined by `specs/widget-manifest.schema.json`.

Each widget must declare:

- ID.
- Name.
- Description.
- Category.
- Version.
- Supported sizes.
- Required permissions.
- State schema.
- Render strategy.
- Whether it is prebuilt or generated.

Render strategies:

- `react_component` for trusted prebuilt widgets shipped with the app.
- `sandboxed_iframe` for generated or custom HTML widgets.

Permissions:

- `board.read`
- `board.write`
- `network.request`
- `storage.local`
- `tools.invoke`

Generated/custom HTML widgets must set `kind` to `custom_html`, use `sandboxed_iframe`, and set `sourceVersioned` to `true`.

Permission validation is implemented in `src/server/widgets/permissions.ts`.

Custom HTML widgets default to no permissions. In particular, `network.request` and `tools.invoke` are not granted unless a later permission workflow explicitly adds them.

## Custom HTML widget safety

Generated widgets must:

- Render in sandboxed iframe.
- Have network disabled by default or controlled by policy.
- Have no direct access to parent app.
- Have no direct access to secrets.
- Have no direct access to filesystem.
- Have no direct access to assistant tools.
- Use a mediated bridge only when explicitly allowed.

## Suggested iframe sandbox baseline

Start restrictive. Add capabilities only when justified.

Example conceptual policy:

```text
sandbox="allow-scripts"
```

Avoid enabling forms, popups, top navigation, same-origin, or downloads unless specifically required and reviewed.

The initial renderer is `src/app/components/SandboxedHtmlWidget.tsx`. It uses:

- `sandbox="allow-scripts"`
- `referrerPolicy="no-referrer"`
- `srcDoc` for isolated source rendering

It does not grant same-origin, form, popup, navigation, download, storage, network policy, or tool bridge permissions.

The renderer requires explicit user confirmation before assigning `srcDoc`, so generated HTML does not execute during initial board render.

## Widget state

MVP options:

- Store state inside widget instance content.
- Store state in app database keyed by widget instance ID.
- Keep generated widget code separate from widget user data.

Do not mix executable widget source with user data.

## Versioning

Generated widget source should be versioned so users can inspect and rollback changes.

## Persistence model

Custom HTML widget persistence starts in `prisma/schema.prisma`:

- `WidgetDefinition` stores manifest-level metadata and permission/state schemas.
- `WidgetInstance` stores per-board/per-workspace widget state and granted permissions.
- `CustomHtmlWidgetSource` stores versioned generated HTML/CSS/JS source separately from instance state.

Executable widget source must not be mixed with user widget state.
