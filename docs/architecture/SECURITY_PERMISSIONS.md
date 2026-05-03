# Security and Permissions

## Security principles

- Protect user data.
- Do not expose secrets.
- Validate every tool input.
- Treat generated code as untrusted.
- Treat Telegram input as external/untrusted.
- Use least privilege.
- Make dangerous actions visible and reversible.

## Sensitive areas

- Auth.
- Telegram linking.
- Assistant tool calls.
- Generated HTML widgets.
- External APIs.
- File uploads.
- Reminders/schedules.
- Persistent data deletion.
- Sharing/public links.

## Generated widget policy

Generated widgets must be sandboxed.

Default:

- No secrets.
- No direct parent app access.
- No direct tool access.
- No network unless permission is granted.
- No access to unrelated board data.
- No destructive actions.

## Assistant action permission levels

### Level 1

Safe board creation and visual changes.

### Level 2

Persistent tasks/reminders and item edits.

### Level 3

External integrations.

### Level 4

Generated code execution or tool-enabled widgets.

## Audit events

Audit these actions:

- Board created/updated/deleted.
- Canvas item created/updated/deleted.
- Assistant tool call succeeded/failed.
- Telegram command executed.
- Widget generated/updated.
- Permission granted/denied.
- Reminder scheduled/cancelled.
