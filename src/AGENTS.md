# Source Code Contract

This folder will own application source code once implementation begins.

Agents editing source code must:

- Read root `AGENTS.md`.
- Read this file.
- Read nearest local `AGENTS.md`.
- Keep source aligned with docs and specs.
- Prefer typed interfaces.
- Validate assistant tool inputs.
- Keep mobile UX first.
- Avoid broad rewrites.
- Update tests and docs in the same session.

## Expected future structure

Actual structure may change after stack decision, but likely areas include:

```text
src/
  app/
  components/
  features/
    assistant/
    boards/
    canvas/
    widgets/
    tasks/
    telegram/
  server/
  db/
  lib/
```

Add local `AGENTS.md` files as these folders are created.
