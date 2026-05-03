# Manual QA Flows

## 1. User creates board from chat

- [ ] User opens chat.
- [ ] User asks: "Create a board for planning my week."
- [ ] Assistant creates board.
- [ ] Execution card appears.
- [ ] User opens board.
- [ ] Board contains useful sections/items.
- [ ] User can edit an item.
- [ ] Board persists after refresh.

## 2. User creates board manually

- [ ] User opens board explorer.
- [ ] User taps create board.
- [ ] User names board.
- [ ] Board opens.
- [ ] Board appears in explorer.
- [ ] Works on mobile drawer.

## 3. User creates sub-board

- [ ] User opens existing board.
- [ ] User creates sub-board.
- [ ] Parent/child relationship appears in explorer.
- [ ] Board link item can be placed on parent board.

## 4. Canvas mobile controls

- [ ] User opens board on phone width.
- [ ] User taps item.
- [ ] Bottom sheet opens.
- [ ] User edits item.
- [ ] User moves item.
- [ ] User resizes item if supported.
- [ ] User closes sheet.
- [ ] No hover-only controls required.

## 5. Add prebuilt widget

- [ ] User opens widget library.
- [ ] User selects task list.
- [ ] Widget appears on board.
- [ ] User adds task.
- [ ] Widget persists after refresh.
- [ ] Assistant can add task to widget.

## 6. Generate custom HTML widget

- [ ] User asks assistant for simple budget tracker.
- [ ] Assistant generates preview.
- [ ] Permission summary is shown.
- [ ] User confirms.
- [ ] Widget renders in iframe.
- [ ] Widget cannot access unrestricted app data.
- [ ] User can remove widget.
- [ ] Widget source/version can be inspected or rolled back.

## 7. Telegram quick capture

- [ ] User links Telegram account.
- [ ] User sends `/boards`.
- [ ] Bot lists boards.
- [ ] User sends note to board.
- [ ] Note appears on board.
- [ ] Bot replies with success/link.
- [ ] Unlinked user command is rejected.

## 8. Task/reminder

- [ ] User creates task from web.
- [ ] User creates reminder from assistant.
- [ ] Task appears in task center.
- [ ] Reminder appears in relevant board/widget.
- [ ] User can mark complete.
- [ ] User can cancel reminder.

## 9. Security checks

- [ ] No secrets in logs.
- [ ] Generated widget has restrictive sandbox.
- [ ] Destructive actions require confirmation or undo.
- [ ] Telegram actions are linked to correct user.
- [ ] Permission prompts are understandable.
