# Definition of Done

A task is done only when:

- The requested behavior works.
- The change is minimal and focused.
- Relevant types/schema are updated.
- Relevant tests are added or updated where practical.
- Relevant checks have been run.
- Documentation is updated.
- `TODO.md` status is updated.
- `CURRENT_STATUS.md` is updated if project state changed.
- `SESSION_HANDOFF.md` is updated.
- Any skipped checks are documented.
- Any known risks are documented.
- No secrets or sensitive values are committed.

## Extra requirements for UI tasks

- Mobile behavior reviewed.
- Loading state considered.
- Empty state considered.
- Error state considered.
- Accessibility considered.
- UI matches existing patterns.

## Extra requirements for assistant tools

- Input validation.
- Permission check.
- Clear structured output.
- Tool call logged.
- User-visible execution card.
- Failure path documented.

## Extra requirements for generated widgets

- Sandboxed iframe.
- Permission policy enforced.
- Source versioned.
- User confirmation for generated code.
- No unrestricted parent app access.
