# 36: Core Operational Files — TOOLS.md, SKILLS.md, RULES.md

**Sources:** `docs/agent-core/TOOLS.md` (34 lines), `docs/agent-core/SKILLS.md` (34 lines), `docs/agent-core/RULES.md` (41 lines)

## Why These Files Exist

The assistant needs to know **what it can do** (TOOLS.md), **how it should approach tasks** (SKILLS.md), and **what boundaries it must respect** (RULES.md). Together, these three files define the assistant's operational envelope — they are the "manual" for assistant behavior.

They are loaded into every LLM call (part of the 5-file context subset) because every interaction might involve tools, skills, or rule boundaries.

## TOOLS.md — The Implemented Capability Catalog

### Content

```markdown
# TOOLS.md

## Board tools
- `create_board`
- `create_sub_board`

## Canvas tools
- `add_canvas_item`
- `update_canvas_item`
- `delete_canvas_item`
- `summarize_board`
- `list_canvas_items`

## Telegram commands
- `/boards`
- `/tasks`
- `/newboard`
- `/addnote`
- `/start <token>`

## Rule
Do not list tools here unless they exist or are actively being implemented.
```

### Why the Separation from SKILLS.md

TOOLS.md lists **implemented atomic operations** — discrete functions the assistant can call. SKILLS.md lists **compound behaviors** — workflows that combine multiple tools.

For example:
- `create_board` is a tool (one API call, one outcome).
- "Board architect" is a skill (uses `create_board`, `add_canvas_item`, layout logic, naming conventions).

This separation prevents the LLM from confusing "things it can do" with "things it's been trained to do well."

### The "No Aspirational Listings" Rule

> Do not list tools here unless they exist or are actively being implemented.

This is the most important rule in TOOLS.md. LLMs will confidently attempt to use any tool listed in their system prompt, even if it doesn't exist. If TOOLS.md lists `generate_presentation_slides` but there's no implementation, the assistant will try to call it, fail silently or hallucinate a result, and the user will get a broken experience.

**What "actively being implemented" means:** A tool whose code is in a PR branch that will merge within the current sprint. Not a roadmap item. Not a wish. Not a "wouldn't it be cool if."

### Tool Answer Grounding Rules

```markdown
Board and item answers must be grounded in tool results. Use `summarize_board`
before describing what is visible on a board. Use `list_canvas_items` before
targeting an existing item for update or delete.
```

This prevents two common LLM failures:
1. **Describing stale state** — The assistant shouldn't say "Your board has 3 notes" without checking. The board might have changed since the last tool call.
2. **Hallucinated item IDs** — The assistant shouldn't say "I'll update item XYZ" without first listing items and finding a real ID.

### Telegram Commands in TOOLS.md

Telegram commands are listed here but marked as "not assistant tools yet." This is honest: the commands exist and work, but the assistant can't invoke them directly. Listing them prevents the assistant from trying to use Telegram commands as if they were regular tools.

## SKILLS.md — Compound Behavioral Workflows

### Content

```markdown
# SKILLS.md

## Board architect
Creates useful board structures with sections, widgets, notes, and next actions.

## Diagram maker
Turns concepts into flowcharts, mind maps, decision trees, timelines, and system diagrams.

## HTML widget builder
Creates safe, mobile-friendly, sandboxed HTML widgets.

## Organizer
Cleans messy boards by grouping notes, naming sections, converting notes into tasks.

## Task manager
Creates and updates tasks, reminders, recurring schedules, and daily summaries.

## Telegram operator
Handles quick capture from Telegram and routes messages to the correct board.
```

### Skill Categories

| Skill | Composes These Tools | Trigger Pattern |
|---|---|---|
| Board architect | `create_board`, `create_sub_board`, `add_canvas_item` | User says "plan," "setup," "organize" |
| Diagram maker | `add_canvas_item` (with diagram types) | User says "explain," "visualize," "how X relates to Y" |
| HTML widget builder | `add_canvas_item` (with HTML source) | User says "build a widget," "make a tool for X" |
| Organizer | `list_canvas_items`, `update_canvas_item`, `delete_canvas_item` | User says "clean up," "organize," "this is messy" |
| Task manager | `add_canvas_item` (task type), `/tasks` | User says "remind me," "what's due," "add task" |
| Telegram operator | Telegram commands | User sends message via Telegram |

### HTML Widget Builder Safety Rules

The HTML widget builder skill includes inline safety rules:

```markdown
Rules:
- Keep widgets small.
- Avoid external scripts by default.
- Avoid network access by default.
- Make UI readable on mobile.
- Separate widget source from widget state.
- Request confirmation before running generated widgets.
```

These are repeated here (not just in RULES.md) because the widget builder skill is a specific high-risk area. The LLM needs widget-specific constraints in the same context as widget-building instructions. If the rules were only in RULES.md, the assistant might not associate them with widget generation.

### What SKILLS.md Is Not

- It's not a prompt template. Skills don't have step-by-step instructions.
- It's not a tool registry. Skills don't map 1:1 to API calls.
- It's not exhaustive. Not every possible assistant behavior needs a named skill.

SKILLS.md communicates **bias**: "You have these capabilities. You should use them when appropriate." It's nudging the LLM toward using organized patterns rather than ad-hoc tool combinations.

## RULES.md — The Safety and Integrity Contract

### Content

```markdown
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
When tools, skills, permissions, or board behavior change, update the relevant
Markdown core files.

Do not describe unimplemented tools as available.
```

### Safety Rules as Negative Constraints

All safety rules are written as "Do not" imperatives. This is intentional:
- LLMs respond better to negative constraints when the desired behavior is "don't do X."
- Positive framing ("Do validate input") can be interpreted as "sometimes validate input."
- Negative framing ("Do not skip validation") is harder to misinterpret.

### The "Secrets" Rule in Practice

"Do not expose secrets" covers many scenarios:
- Don't include API keys in generated HTML widgets.
- Don't mention `TELEGRAM_BOT_TOKEN` in user-facing messages.
- Don't log environment variable values in error messages.
- Don't show the raw `tokenHash` value to users.

### Soft Delete Preference

"Prefer soft delete" means: set `deletedAt` instead of removing rows. This:
- Makes deletions reversible (user can recover items).
- Preserves audit trail.
- Prevents referential integrity issues.
- Allows "undo" operations.

Hard delete should only happen when the user explicitly confirms a permanent deletion.

### Tool Rules — The Execution Contract

| Rule | What It Prevents |
|---|---|
| Validate input | SQL injection, type confusion, malformed data |
| Check permissions | Unauthorized access to other users' workspaces |
| Return structured output | LLM hallucinating tool results |
| Log tool calls | Untraceable actions, debugging black holes |
| Show user-visible execution cards | User not knowing what the assistant did |

### Docs Synchronization Rules

The rules include a self-referential requirement: "When tools, skills, permissions, or board behavior change, update the relevant Markdown core files."

This is a **meta-rule** — it tells the assistant (and developers) that core files cannot become stale. If a new tool is implemented, TOOLS.md must be updated in the same PR. If a safety boundary changes, RULES.md must reflect it.

The explicit update map:

```markdown
- Tool or Telegram command behavior changes update `TOOLS.md`.
- Assistant behavior changes update `ASSISTANT.md`.
- Safety, permission, confirmation, audit, or data-integrity changes update `RULES.md`.
- Memory behavior changes update `MEMORY.md`.
- Board organization or board-summary behavior changes update `BOARDS.md`.
- Product-level assistant operating assumptions update `CORE.md`.
```

This mapping prevents ambiguity about which file to update for which change.

## How These Three Files Relate

```
TOOLS.md   →  "Here's what I can do."
SKILLS.md  →  "Here's how I should approach tasks."
RULES.md   →  "Here's what I must never do."
```

They form a permission gradient:
- TOOLS.md grants capability (allowed actions).
- SKILLS.md suggests patterns (preferred ways to combine actions).
- RULES.md restricts behavior (prohibited actions).

When the LLM wants to act, it must check all three:
1. Does TOOLS.md say this tool exists? (Capability check)
2. Is there a SKILL that suggests a better approach? (Pattern check)
3. Does RULES.md forbid this? (Safety check)

## The "Implementation, Not Aspiration" Principle

All three files share one meta-rule: "Do not describe unimplemented tools as available." This applies to:
- TOOLS.md: Don't list `generate_pdf_report` unless it exists.
- SKILLS.md: Don't describe a "video editor" skill unless video editing is implemented.
- RULES.md: Don't say "widgets can access the file system with user permission" unless that permission model is built.

The corollary: if you want the assistant to behave a certain way, you must first implement the tools that enable that behavior, then document them in these files. Writing the documentation first doesn't make the behavior real — it makes the assistant confidently hallucinate.
