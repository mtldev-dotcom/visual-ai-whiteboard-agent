# Docs Folder Contract

This folder owns product, architecture, implementation, QA, and assistant-core documentation.

Agents must update docs whenever implementation changes behavior, architecture, APIs, schemas, setup, or user flows.

## Rules

- Keep docs practical and implementation-aligned.
- Do not allow docs to become aspirational fiction.
- Mark uncertain or future ideas clearly.
- Prefer updating an existing doc over creating duplicates.
- When a behavior changes, update the closest relevant doc.
- When a folder-level rule changes, update the nearest `AGENTS.md`.

## Required docs to check

- Product changes: `docs/product/`
- Architecture changes: `docs/architecture/`
- Implementation/task changes: `docs/implementation/`
- Testing changes: `docs/qa/`
- Assistant behavior changes: `docs/agent-core/`
