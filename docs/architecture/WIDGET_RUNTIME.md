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

Each widget should declare:

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

## Widget state

MVP options:

- Store state inside widget instance content.
- Store state in app database keyed by widget instance ID.
- Keep generated widget code separate from widget user data.

Do not mix executable widget source with user data.

## Versioning

Generated widget source should be versioned so users can inspect and rollback changes.
