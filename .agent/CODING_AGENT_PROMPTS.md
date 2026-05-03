# Ready-to-Use Coding Agent Prompts

## Start from scratch

```text
Read the repository instructions and start Phase 0.

You must follow AGENTS.md exactly. Create the initial app skeleton, document the stack decision, add lint/typecheck/test/build scripts, create .env.example, and update all required docs and handoff files before stopping.
```

## Continue from latest handoff

```text
Read AGENTS.md, CURRENT_STATUS.md, SESSION_HANDOFF.md, and TODO.md. Continue from the latest recommended task. Make the smallest correct change and update docs plus handoff before stopping.
```

## Build board engine

```text
Implement the next incomplete Phase 1 task from TODO.md. Preserve structured canvas data rules from docs/architecture/CANVAS_ENGINE.md and specs/canvas-item.schema.json. Update architecture docs, TODO.md, CURRENT_STATUS.md, and SESSION_HANDOFF.md.
```

## Build assistant tool

```text
Implement the next incomplete assistant tool from Phase 3 in TODO.md. Tool behavior must match specs/canvas-tools.schema.json and docs/architecture/ASSISTANT_TOOLS.md. Add tests where practical and update docs plus handoff.
```

## Build HTML widget runtime

```text
Implement the next incomplete Phase 5 task. Follow docs/architecture/WIDGET_RUNTIME.md and docs/architecture/SECURITY_PERMISSIONS.md. Do not weaken sandboxing. Update docs, TODO.md, CURRENT_STATUS.md, and SESSION_HANDOFF.md.
```

## Build Telegram feature

```text
Implement the next incomplete Telegram task from Phase 7. Follow docs/architecture/TELEGRAM_INTEGRATION.md. Persistent data changes must use the same permission/audit model as web actions. Update docs and handoff.
```
