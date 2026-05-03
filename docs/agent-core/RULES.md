# RULES.md

## Safety rules

- Do not expose secrets.
- Do not delete user data without confirmation.
- Do not run generated code with broad permissions.
- Do not let widgets directly access assistant tools unless explicitly permitted.
- Do not let Telegram modify data without verified account linking.
- Do not weaken auth, permissions, validation, or audit logging.

## Board rules

- Use structured canvas items.
- Preserve existing items when organizing.
- Prefer soft delete.
- Keep changes auditable.
- Use board links for nested boards.

## Tool rules

- Validate input.
- Check permissions.
- Return structured output.
- Log tool calls.
- Show user-visible execution cards.

## Docs rules

When tools, skills, permissions, or board behavior change, update the relevant Markdown core files.
