# Product Requirements Document

## 1. Overview

Build a mobile-first AI workspace where users interact with an assistant that can create, edit, and organize visual boards.

The assistant is available from:

- Web chat.
- Board floating assistant.
- Telegram bot.

The visual workspace supports:

- Boards and sub-boards.
- Structured canvas items.
- Images.
- Notes.
- Markdown blocks.
- Browser/iframe embeds.
- Prebuilt widgets.
- Sandboxed generated HTML widgets.
- Tasks, reminders, alarms, and schedules.

## 2. Goals

- Let users create useful boards from natural language.
- Let the assistant manipulate the board through safe structured tools.
- Make the app highly usable on mobile.
- Support Telegram quick capture and control.
- Provide Markdown core files for assistant behavior, tools, skills, and rules.
- Keep architecture safe around generated code and external integrations.

## 3. Non-goals for MVP

- Full multiplayer whiteboard collaboration.
- Full vector drawing suite.
- Full Figma/Miro-level editing.
- Public marketplace for widgets.
- Complex workflow automation engine.
- Unrestricted generated code execution.
- Native mobile apps.

## 4. Target users

- People who want an AI assistant that organizes ideas visually.
- Builders and planners who prefer boards, diagrams, and dashboards.
- Users who capture ideas from mobile/Telegram and want them organized later.
- Teams or individuals who want lightweight mini-app workspaces.

## 5. Primary use cases

### Create a planning board

User says:

> Create a board for launching my app.

Assistant creates:

- Sections.
- Notes.
- Milestones.
- Task list.
- Risks.
- Next actions.

### Organize messy ideas

User dumps notes onto a board and asks:

> Clean this up.

Assistant groups related items, names sections, turns tasks into checklist items, and creates a summary.

### Generate a mini app

User says:

> Add a simple budget tracker here.

Assistant creates a sandboxed HTML widget with income, expense, and total fields.

### Quick capture from Telegram

User sends:

> Add "call supplier" to my launch board tomorrow.

Assistant creates a task/reminder and replies with a board link.

## 6. Core product surfaces

- Home dashboard.
- Chat.
- Board/canvas.
- Board explorer.
- Widget library.
- Task/reminder center.
- Files/media.
- Markdown core files.
- Settings/integrations.

## 7. Success criteria for MVP

- User can create a board from chat.
- Assistant can add structured canvas items.
- User can manually edit basic board items.
- App is comfortable on mobile.
- User can add at least one prebuilt widget.
- User can add a sandboxed custom HTML widget.
- User can create tasks/reminders.
- Telegram can add notes/tasks to a board.
- Docs and handoffs remain maintained by coding agents.
