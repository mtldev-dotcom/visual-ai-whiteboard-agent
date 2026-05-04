# 37: Core Context Files — MEMORY.md, BOARDS.md, USER_TEMPLATE.md

**Sources:** `docs/agent-core/MEMORY.md` (23 lines), `docs/agent-core/BOARDS.md` (23 lines), `docs/agent-core/USER_TEMPLATE.md` (30 lines)

## Why These Files Exist

Unlike the first 5 core files (loaded into every LLM call), these three files are **not** part of the assistant context subset. They serve different purposes:

- `MEMORY.md` — Defines **how** the assistant remembers, not **what** it remembers (actual memory is dynamically populated).
- `BOARDS.md` — Documents organizational conventions for board structure.
- `USER_TEMPLATE.md` — A template for per-user assistant context (not yet populated at runtime).

They are part of the 8-file core system because they define assistant behavior, but they're excluded from the LLM context subset to save tokens and because their content is either dynamic or structural.

## MEMORY.md — Cross-Session Memory Rules

### Content

```markdown
# MEMORY.md

## Purpose
This file defines how long-term memory should work.

## MVP memory
Start simple:
- User preferences.
- Board summaries.
- Frequently used boards.
- Assistant behavior preferences.
- Integration preferences.

## Rules
- Do not store sensitive personal data unless the user clearly wants it.
- Let users review and delete memory.
- Keep memory concise.
- Prefer board-specific summaries over massive raw history.
- Do not treat generated widget content as memory automatically.
```

### What MEMORY.md Is (and Isn't)

**It is** a specification for the memory system. It defines what kinds of information should be persisted across sessions and what rules govern that persistence.

**It is not** the actual memory store. The actual memory lives in:
- The database (user preferences, board state).
- Potentially a vector store or summary index (future).
- The `MEMORY.md` file itself (if populated with dynamic content at runtime).

### Memory Categories

| Category | Storage Mechanism | Example |
|---|---|---|
| User preferences | Database (UserProfile or similar) | Language: Spanish, Tone: Casual |
| Board summaries | Generated summaries stored with board metadata | "Launch Plan board: 3 sections, 12 notes, 2 widgets" |
| Frequently used boards | Usage analytics or explicit pinning | Home Dashboard, Project Alpha |
| Assistant behavior preferences | `docs/agent-core/CORE.md` or `ASSISTANT.md` (user-edited) | "Be more concise," "Use bullet points" |
| Integration preferences | Database (UserProfile or similar) | Telegram: linked, Notifications: daily summary |

### Memory Safety Rules

**"Do not store sensitive personal data unless the user clearly wants it."**

This means: if the user says "my password is hunter2," the assistant should NOT persist that as memory. But if the user says "remember that my daughter's name is Emma and I like to see her name in task titles," that's an explicit request to store personal data.

**"Let users review and delete memory."**

The `/core` page or a future `/settings/memory` page must show all stored memory and allow deletion. No hidden, unremovable memory.

**"Prefer board-specific summaries over massive raw history."**

This is a storage efficiency rule. Instead of storing every chat message forever:
- Generate a summary of what was discussed and decided.
- Store that summary with the relevant board.
- Discard the raw transcript unless the user explicitly wants it kept.
- This also prevents the LLM context from growing unboundedly.

**"Do not treat generated widget content as memory automatically."**

If the assistant generates an HTML widget, the widget's source code is not automatically stored as user memory. The widget is a tool artifact, not a user preference or knowledge. The user might throw it away without wanting "Generated a timer widget on 2024-03-15" to persist in their memory.

### Why MEMORY.md Is Not in the LLM Context Subset

The file defines **how memory works**, but the LLM receives the actual memory content dynamically at runtime. Including the meta-rules about memory in every LLM call would be redundant — the memory system itself enforces them server-side.

## BOARDS.md — Board Organization Conventions

### Content

```markdown
# BOARDS.md

## Purpose
This file documents board organization conventions.

## Suggested default boards
- Home Dashboard.
- Ideas.
- Tasks.
- Notes.
- Projects.
- Personal.
- Archive.

## Board structure rules
- Use sub-boards when a topic becomes large.
- Use sections for groups inside a board.
- Use board links when moving between related boards.
- Keep board names clear and short.
- Create summaries for complex boards.
```

### Suggested Default Boards

These 7 board names are suggestions, not automatic creation. They establish a convention for new workspaces. When a user creates their first workspace, the assistant might suggest creating these boards, but it shouldn't auto-create them without user consent.

The names follow a pattern:
- **Function-based** (Tasks, Notes, Ideas) — boards organized by what they contain.
- **Project-based** (Projects) — boards organized by initiative.
- **Personal** — a catch-all for non-work content.
- **Archive** — a place for completed/abandoned boards (replaces deletion).

### Board Structure Rules in Practice

```
                Workspace
                    |
    +-------+-------+-------+-------+
    |       |       |       |       |
  Home    Ideas   Tasks   Projects  Personal
  Dash-                            [sub: Fitness]
  board                             [sub: Reading]
     |                                   |
  [section: Today]              [board link → Archive/Old-Projects]
  [section: This Week]
  [widget: Task List]
  [widget: Calendar]
```

**"Use sub-boards when a topic becomes large."**

If "Projects" has 20 sub-projects, create dedicated boards per project as children of "Projects." Don't cram everything into one board with sections.

**"Use sections for groups inside a board."**

Within a single board, use visual sections (colored areas, headers) to group related items. Sections are lighter-weight than sub-boards and live on the same canvas.

**"Use board links when moving between related boards."**

A board link is a canvas item that navigates to another board when tapped. This creates a navigable board graph, like a wiki but visual.

**"Keep board names clear and short."**

"Q3 Marketing Campaign Strategy and Execution Plan 2024" → "Q3 Marketing" or "Campaign Strategy." Long names waste space in board lists, Telegram command output, and canvas headers.

**"Create summaries for complex boards."**

If a board has >20 items, the assistant should generate a short summary (sticky note or board description) explaining what's on the board and how it's organized. This helps users re-orient after being away.

### Why BOARDS.md Is Not in the LLM Context Subset

These conventions are structural, not behavioral. They guide how boards SHOULD be organized, but don't affect runtime tool selection or safety. Including them in every LLM call would consume tokens for information that the assistant rarely needs to reference.

## USER_TEMPLATE.md — Per-User Context Template

### Content

```markdown
# USER.md Template

## Preferences
- Preferred language:
- Preferred tone:
- Preferred default board:
- Preferred notification channel:
- Timezone:
- Mobile-first settings:

## Board preferences
- Favorite board types:
- Default widgets:
- Organization style:

## Integration preferences
- Telegram:
- Email:
- Calendar:
- Files:

## Memory preferences
- What to remember:
- What not to remember:
```

### What USER_TEMPLATE.md Represents

This is a **template** for a future per-user assistant core file. It defines the schema of user-specific context that the assistant should be aware of when interacting with a particular user.

Currently, it's a skeleton with empty fields. The plan is:
1. Users fill out their profile via a `/settings` page.
2. The template is populated and saved as `USER_<userId>.md` or similar.
3. The populated file is injected into LLM context for that user's sessions.

### Preference Categories

| Category | Why the Assistant Needs It |
|---|---|
| Language preference | Generate responses in the user's language |
| Tone preference | Match formality level (professional vs. casual) |
| Default board | Where to add items when user doesn't specify a board |
| Notification channel | Where to send reminders and summaries |
| Timezone | Schedule reminders and "daily summary" at the right time |
| Board preferences | Create boards the user will actually like using |
| Integration preferences | Know which external services are connected |
| Memory preferences | Know what kind of memory the user wants |

### Why USER_TEMPLATE.md Is Not in the LLM Context Subset

The template is empty — it would waste tokens and confuse the LLM. When the template is populated for a real user, the populated version will be dynamically loaded as part of that user's session context (not from the static file, but from the database or a generated per-user file).

### Design Notes

The template uses a flat key-value structure, not nested sections, for two reasons:
1. Easy to populate from a settings form (one field per key).
2. Easy for the LLM to parse (flat structure = fewer tokens for structure overhead).

The fields marked "What to remember" and "What not to remember" give users granular control over memory. A user might say:
- Remember: project names, team members, deadlines.
- Don't remember: personal anecdotes, temporary notes, draft ideas.

## Summary: Why These Three Files Are Separate

```
Context subset (loaded into LLM):   CORE.md, ASSISTANT.md, TOOLS.md, SKILLS.md, RULES.md
Structural/aspirational (not loaded): MEMORY.md, BOARDS.md, USER_TEMPLATE.md
```

The split is based on **runtime relevance**:
- The first 5 define immediate behavior (what to do, how to talk, what tools exist).
- The last 3 define longer-term conventions (how memory works, how boards are organized, what user context looks like).

If the system grows to hundreds of users with different preferences, `USER_TEMPLATE.md` would be replaced by dynamic per-user context loading, but the template serves as a schema anchor until that system is built.
