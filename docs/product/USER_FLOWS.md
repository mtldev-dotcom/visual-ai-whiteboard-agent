# User Flows

## Flow 1 — Create board from chat

1. User opens chat.
2. User types: "Create a board to plan my product launch."
3. Assistant creates a board.
4. Assistant adds structured sections and items.
5. Chat shows execution cards.
6. User taps "Open board."
7. Board loads with created items.

Acceptance:

- Board exists.
- Items are editable.
- Assistant explains what it created.
- Works on mobile.

## Flow 2 — Add widget to board

1. User opens a board.
2. User taps widget library or asks assistant.
3. User/assistant selects "Task List."
4. Widget appears on board.
5. User can edit tasks.
6. Assistant can add tasks to it later.

Acceptance:

- Widget persists.
- Widget can be moved/resized.
- Widget data is saved.

## Flow 3 — Generate custom HTML widget

1. User asks: "Make a simple budget tracker here."
2. Assistant generates widget source.
3. App shows preview and permission summary.
4. User confirms.
5. Widget is added as sandboxed iframe.
6. Widget state saves according to allowed policy.

Acceptance:

- No broad permissions by default.
- Widget source is versioned.
- User can remove or rollback widget.

## Flow 4 — Telegram quick capture

1. User sends Telegram message: "Add note to Ideas board: build visual assistant."
2. Bot validates linked account.
3. Assistant creates note on target board.
4. Bot replies with success and board link.

Acceptance:

- Only linked user can modify their workspace.
- Action is logged.
- Failure message is clear.

## Flow 5 — Organize board

1. User opens messy board.
2. User asks: "Clean this up."
3. Assistant analyzes board items.
4. Assistant proposes or applies organization based on permission level.
5. Board items are grouped/renamed/moved.
6. Summary note is created.

Acceptance:

- Existing items are preserved.
- Major destructive changes require confirmation.
- Undo or rollback is possible.

## Flow 6 — Mobile selected item controls

1. User opens board on phone.
2. User taps sticky note.
3. Bottom sheet opens.
4. User can edit, duplicate, delete, ask AI, or open full screen.
5. Bottom sheet does not block core navigation.

Acceptance:

- Controls are thumb-friendly.
- Board remains readable.
- No tiny desktop-only controls.
