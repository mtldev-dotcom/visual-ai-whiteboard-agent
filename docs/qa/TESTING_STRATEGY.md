# Testing Strategy

## Check levels

### Static checks

- Typecheck.
- Lint.
- Format.

### Unit tests

Use for:

- Data model helpers.
- Permission logic.
- Tool input validation.
- Widget manifest validation.
- Schedule/reminder helpers.

### Integration tests

Use for:

- Board CRUD.
- Canvas item CRUD.
- Assistant tool execution.
- Telegram command handling.
- Widget runtime policy.

### End-to-end tests

Use for:

- Create board from chat.
- Add canvas item.
- Add widget.
- Mobile selected item controls.
- Telegram quick capture where practical.

### Manual QA

Required for:

- Mobile canvas feel.
- Pan/zoom usability.
- Generated HTML widget confirmation.
- Telegram account linking.
- Permission prompts.
