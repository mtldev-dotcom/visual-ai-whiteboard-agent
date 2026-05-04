# 35: Core Identity Files — CORE.md and ASSISTANT.md

**Sources:** `docs/agent-core/CORE.md` (27 lines), `docs/agent-core/ASSISTANT.md` (28 lines)

## Why These Files Exist

The assistant needs a consistent identity. Without explicit instructions, an LLM defaults to being a generic helpful chatbot. These two files define **what** the assistant should be (CORE.md) and **how** it should communicate (ASSISTANT.md).

They are the two most important core files because:
1. They are loaded into every LLM call (part of the 5-file context subset).
2. They define behavior that applies to every interaction.
3. They establish the product's "voice" and operating philosophy.

## CORE.md — Mission and Operating Principles

### Structure

```markdown
# CORE.md

## Assistant mission
## Core behavior
## Visual-first rule
## Mobile-first rule
```

### Assistant Mission

> Help the user think, organize, plan, and act by combining chat with a visual board.

**Why this wording matters:** Each verb is carefully chosen:
- **Think** — The assistant helps users reason through problems, not just give answers.
- **Organize** — Structure is a core value. Messy thoughts become organized boards.
- **Plan** — Proactive planning, not reactive Q&A.
- **Act** — The assistant takes action (creates items, boards, widgets), not just talks.
- **Combining chat with a visual board** — This is the core differentiator. It's not a chatbot. It's not a whiteboard. It's both.

The mission also states: "The assistant should decide when a visual board, widget, task list, diagram, or note is more useful than a text-only answer." This is the **visual-first rule** — the assistant should proactively suggest visual representations when they add value.

### Core Behavior Rules

```
- Be useful.
- Be concrete.
- Prefer clear structure.
- Create visual workspace objects when helpful.
- Keep user in control.
- Explain tool actions.
- Avoid destructive changes without confirmation.
- Keep boards organized.
- Preserve user data and privacy.
```

Each rule is short (2-5 words) because these are injected into LLM context and longer descriptions waste tokens. The rules establish:

| Rule | What It Prevents |
|---|---|
| Be useful | Philosophical musings, unactionable advice |
| Be concrete | Vague suggestions ("you should plan this") |
| Prefer clear structure | Rambling, unstructured responses |
| Create visual workspace objects | Text-only answers when a diagram would help |
| Keep user in control | The assistant making unilateral decisions |
| Explain tool actions | "Black box" feeling — user doesn't know what happened |
| Avoid destructive changes | Data loss, irreversible actions without consent |
| Keep boards organized | Cluttered boards that become unusable |
| Preserve user data and privacy | Over-sharing, storing unnecessary data |

### Visual-First Rule

> When the user asks for planning, organizing, explaining, brainstorming, tracking, or managing something, consider whether to create or update a board.

This is a trigger list. The assistant should pattern-match against these verbs and auto-suggest board operations. It's not a command — it says "consider whether" — giving the assistant discretion but setting a default bias toward visual representation.

### Mobile-First Rule

> Assume many users are on phones. Do not create workflows that require precise desktop-only interactions.

This affects:
- Widget sizing (smaller default widths)
- Board layout (avoid dense, complex arrangements)
- Interaction patterns (tap-friendly, no hover-dependent UX)
- Text length (shorter messages, no massive walls of text)

**Why this is in CORE.md:** Mobile-first is not a UI concern — it's a behavioral constraint. The assistant itself must generate content and layouts that work on phones.

## ASSISTANT.md — Voice and Communication Style

### Personality

```markdown
## Personality

The assistant should feel like a careful workspace operator:

- Clear.
- Practical.
- Organized.
- Direct.
- Calm.
- Visual when useful.
- Honest about uncertainty.
```

The framing "careful workspace operator" is deliberate. It's not a "friend," "mentor," or "assistant" — it's an operator. Someone who manages a workspace deliberately and with care. Each trait is a single word (again: token efficiency).

**"Honest about uncertainty"** is important. LLMs tend to sound confident even when wrong. This rule explicitly tells the model it's OK to express uncertainty rather than fabricate certainty.

### Default Response Style

```markdown
## Default response style

- Short explanation.
- Clear next action.
- Show what was created or changed.
- Avoid unnecessary fluff.
```

These rules shape every response:
1. **Short explanation** — Don't write essays. One or two sentences of context.
2. **Clear next action** — Always leave the user knowing what to do next (or what the assistant will do next).
3. **Show what was created or changed** — After any tool action, describe the result in user-visible terms.
4. **Avoid unnecessary fluff** — No "Great question!", "I'd be happy to help!", "Let me think about that..."

### Tool Messaging

```markdown
## When using tools

The assistant should tell the user what changed in simple language.

Example:

> I created a new board called "Launch Plan" and added sections for milestones, tasks, risks, and notes.
```

**Why the example matters:** LLMs learn well from examples. The sample shows:
- First-person ("I created") — the assistant owns its actions.
- Named entity ("Launch Plan") — specific, not generic.
- Concrete result ("sections for milestones, tasks, risks, and notes") — shows what was actually done.
- Simple language — no technical jargon like "persisted to database" or "mounted canvas item."

**"Tell the user what changed"** is the anti-pattern to "thinking out loud." The assistant shouldn't say "I'll now create a board and then add sections..." — it should say what happened after it happened.

## How These Files Work Together

```
CORE.md          →  WHAT the assistant should do
ASSISTANT.md     →  HOW the assistant should communicate
```

CORE.md answers: "Should I create a board for this?" → Yes, because visual-first.
ASSISTANT.md answers: "How do I tell the user?" → "I created a board called 'Launch Plan'..."

Without CORE.md, the assistant wouldn't know to create boards proactively.
Without ASSISTANT.md, the assistant might describe board creation as "Board entity persisted to data layer. ID: ck_123abc."

## File Size and Token Budget

Both files are deliberately short (27 and 28 lines, respectively). Every line of these files is injected into every LLM call. At typical pricing, each token costs money and latency. The files are written to maximize behavioral impact per token:

- Single-word personality traits instead of paragraphs.
- Short imperative lists instead of prose.
- One concrete example instead of many.
- No greetings, signatures, or markdown fluff.

## Editing and Customization

These files are user-editable through the `/core` page. When a user edits CORE.md, the assistant's mission literally changes on the next LLM call. This means:
1. Users can add their own behavior rules (e.g., "Use Spanish for all responses").
2. Users can change the tone (e.g., replacing "Calm" with "Energetic").
3. The assistant adapts without code changes or restarts.

**Risk:** A user could write contradictory or harmful instructions in CORE.md. The assistant would follow them because these files are authoritative system instructions. There's no "meta-rules" validation — the core files are the highest authority in the system, above even built-in safety prompts.

## Comparison to Other Systems

| System | Equivalent |
|---|---|
| ChatGPT Custom Instructions | Similar to CORE.md + ASSISTANT.md combined |
| Claude System Prompt | ASSISTANT_CONTEXT_CORE_FILE_NAMES bundle |
| Custom GPTs | The entire core file system |

The difference: this system makes the instructions **editable markdown files in version control**, not hidden configuration in a web UI. The assistant's entire operating manual is transparent and auditable.
