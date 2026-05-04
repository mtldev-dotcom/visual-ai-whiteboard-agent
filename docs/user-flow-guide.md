# User Flow Guide — Manual Testing Reference

**App stage:** Phase 0–8 P0 foundation complete. The UI runs with demo/local state.
No auth, no persistence-backed canvas screen, no hosted LLM, no Telegram webhook yet.

**Start the app before testing:**

```bash
docker compose up -d postgres
npm run dev
```

Open `http://localhost:3000`.

---

## How to read this guide

Each flow lists:

- **Where:** the URL or screen to start on.
- **Steps:** what to do, in order.
- **What works now:** confirmed working in current app stage.
- **What is stubbed/demo:** UI is present but not wired to persistence or a real LLM.
- **Known limitations:** gaps that are expected at this stage.

---

## Flow 1 — Whiteboard workspace shell (`/`)

**Where:** `http://localhost:3000`

### Desktop layout

1. Open `http://localhost:3000` on a screen wider than 1024 px.
2. Confirm the three-column layout loads: left sidebar (Boards + Widgets), center canvas, right assistant panel.
3. Confirm the header shows "Visual AI Whiteboard" with a **Core** link and a **New** button.
4. Confirm the bottom navigation is hidden at desktop width.

**What works:** layout, header, three-column grid, static board list.

**What is stubbed:** the **New** button does nothing. The board list is hardcoded demo data.

---

### Mobile layout

1. Open `http://localhost:3000` on a screen narrower than 1024 px (or use DevTools device emulation at 390 px wide).
2. Confirm the three-column layout collapses into a single-column stack.
3. Confirm the **Boards** disclosure element appears above the canvas. Tap it.
4. Confirm the board list and widget library appear inside the drawer.
5. Tap **Boards** again to collapse the drawer.
6. Confirm the bottom navigation bar shows five tabs: Chat, Board, Widgets, Tasks, Core.
7. Tap **Tasks** — it navigates to `/tasks`.
8. Tap **Core** — it navigates to `/core`.
9. Back-navigate to `/`.

**What works:** responsive layout, drawer toggle, bottom nav links.

**What is stubbed:** Chat, Board, and Widgets bottom-nav tabs are buttons with no routing yet.

---

## Flow 2 — Board explorer sidebar / drawer

**Where:** `http://localhost:3000`

### Desktop sidebar

1. Open desktop layout.
2. Observe the board list in the left sidebar: Launch plan, Messaging (indented), Demo board (indented), Ideas, Tasks.
3. Verify sub-boards are visually indented under their parent.
4. Click any board button.

**What works:** visual hierarchy, indent depth rendering.

**What is stubbed:** clicking a board does not navigate or load a different canvas. Board data is hardcoded.

### Board search input

1. Click the **Search boards** input in the sidebar (desktop) or drawer (mobile).
2. Type any text.

**What is stubbed:** search input is rendered but filtering is not wired up.

---

## Flow 3 — Canvas pan and zoom

**Where:** `http://localhost:3000`, center canvas area

### Pan

1. Click and hold on the canvas background (not on any item).
2. Drag in any direction.
3. Release.
4. Confirm all items move together as the canvas pans.

**What works:** pointer-capture-based panning, cursor changes to grabbing during drag.

### Zoom

1. Locate the zoom control in the top-right corner of the canvas (shows a percentage).
2. Click **+** to zoom in. Confirm items scale up. Maximum is 180%.
3. Click **−** to zoom out. Confirm items scale down. Minimum is 50%.
4. Confirm the percentage readout updates.

**What works:** zoom in/out with clamped range, percentage display.

---

## Flow 4 — Canvas item types

**Where:** `http://localhost:3000`, center canvas

The demo canvas renders eight item types. Locate and inspect each one:

| Item                                     | Visual style              | Location on canvas |
| ---------------------------------------- | ------------------------- | ------------------ |
| Sticky note ("Positioning")              | Yellow background         | Top-left           |
| Text block ("Launch tasks")              | White, plain text         | Top-center         |
| Markdown block ("Demo outline")          | Green tint, pre-formatted | Mid-left           |
| Link card ("Product brief")              | Blue tint, link URL       | Mid-center         |
| Image ("Reference image")                | White with SVG globe      | Top-right          |
| Task list widget ("Launch checklist")    | White, checkbox list      | Mid-right          |
| Notes widget ("Notes")                   | Warm cream background     | Bottom-left        |
| Sandboxed HTML widget ("Sandboxed HTML") | White iframe              | Bottom-right       |

1. Scroll or zoom to see all eight items.
2. Confirm each item renders with correct colors and content.

**What works:** all eight item types render from structured demo data.

---

## Flow 5 — Item selection (desktop and mobile)

**Where:** `http://localhost:3000`, center canvas

### Select an item

1. Click (or tap on mobile) any canvas item.
2. Confirm a green ring (`ring-4 ring-[#2f5d50]`) appears around the item.
3. Confirm a green **Selected** badge appears above the item.
4. Click the canvas background.
5. Confirm the selection ring disappears.

**What works:** click/tap to select, deselect by clicking background.

### Keyboard navigation

1. Tab to a canvas item (press Tab repeatedly).
2. Press **Enter** or **Space**.
3. Confirm the item becomes selected.

**What works:** keyboard selection via Enter and Space.

---

## Flow 6 — Item move and resize

**Where:** `http://localhost:3000`, center canvas

### Move

1. Click a canvas item to select it.
2. Click and hold on the item body.
3. Drag to a new position.
4. Release.
5. Confirm the item moved. The position updates in real time during drag.

**What works:** pointer-capture drag-to-move with zoom-corrected delta.

### Resize

1. Click a canvas item to select it.
2. Locate the green resize handle at the bottom-right corner of the item.
3. Click and hold the resize handle.
4. Drag down-right to enlarge, or up-left to shrink.
5. Release. Confirm the item resized. Minimum width is 160 px, minimum height is 96 px.

**What works:** resize from bottom-right handle, minimum size clamp.

**Known limitation:** moves and resizes are local React state only — they reset on page refresh.

---

## Flow 7 — Mobile bottom sheet for selected items

**Where:** `http://localhost:3000` at mobile width (< 1024 px)

1. Open the page at mobile width.
2. Tap any canvas item.
3. Confirm the bottom sheet slides up with:
   - "Selected" label.
   - Item title or type name.
   - Four action buttons: Edit, Copy, Ask AI, Delete.
   - A **Close** button.
4. Tap **Close** or tap the canvas background.
5. Confirm the bottom sheet disappears.

**What works:** bottom sheet visibility, selected item label, Close button.

**What is stubbed:** Edit, Copy, Ask AI, and Delete buttons are rendered but have no action handlers.

---

## Flow 8 — Desktop floating assistant button

**Where:** `http://localhost:3000` at desktop width (≥ 1024 px)

1. Open desktop layout.
2. Locate the green **Ask AI** button in the bottom-right corner of the canvas.
3. Click it.

**What is stubbed:** the button is rendered but has no click handler. The assistant panel is always visible on desktop as the right column.

---

## Flow 9 — Assistant chat panel

**Where:** `http://localhost:3000`, right column (desktop) or Chat tab (mobile)

### Send a message

1. Locate the assistant panel on the right.
2. See the pre-loaded welcome message: "I can help shape this board."
3. See the demo tool execution card for `create_board` with status **success**.
4. Click the **Ask AI…** text input.
5. Type any message (e.g., "Add a sticky note about onboarding").
6. Press **Enter** or click **Send**.
7. Confirm your message appears in the chat with a blue-tint bubble on the right side.

**What works:** message input, send on Enter/button, local message rendering, user/assistant/tool bubble styles.

**What is stubbed:** the app does not call an LLM. Typed messages are added to local state only. No assistant response is generated. The `LLM_PROVIDER=local` adapter returns deterministic responses but is not wired to the chat UI yet.

---

## Flow 10 — Sandboxed HTML widget confirmation gate

**Where:** `http://localhost:3000`, canvas — find the "Sandboxed HTML" item at bottom-right

1. Locate the **Sandboxed HTML** canvas item.
2. If the page just loaded, the item shows a confirmation screen: title "Sandboxed HTML", descriptive text "Generated HTML is sandboxed and isolated.", and a green **Run** button.
3. Click **Run**.
4. Confirm the item now renders the sandboxed iframe content: a white panel with "Sandboxed Widget" heading.

**What works:** confirmation gate, Run button activates iframe `srcDoc`, `sandbox="allow-scripts"` with no same-origin grant, `referrerPolicy="no-referrer"`.

**What is stubbed:** widget HTML is hardcoded demo content. Real assistant-generated widgets are not wired yet.

---

## Flow 11 — Widget library

**Where:** `http://localhost:3000`, left sidebar (desktop) or inside the Boards drawer (mobile), scroll down past the board list

1. Scroll to the **Widgets** section below the board list.
2. Confirm two widget cards: **Task List** (Productivity category) and **Notes** (Notes category).
3. Click either widget card.

**What is stubbed:** clicking a widget card does nothing. Adding widgets to the canvas is not yet wired.

---

## Flow 12 — Tasks page (`/tasks`)

**Where:** `http://localhost:3000/tasks`

1. Navigate to `/tasks` (click **Tasks** in mobile bottom nav, or go directly).
2. Confirm the page header shows "Tasks" under "Workspace".
3. Confirm three demo task cards:
   - "Prepare demo board" — high priority, board: Launch plan, due: Today.
   - "Review Telegram capture flow" — normal priority, board: Launch plan, due: Tomorrow.
   - "Collect widget ideas" — low priority, board: Ideas, due: Unscheduled.
4. Confirm each card shows title, board name, priority badge, and due date.

**What works:** page renders, mobile-first layout, task card structure.

**What is stubbed:** tasks are hardcoded demo data. No create/edit/complete actions are wired. No database reads occur here.

---

## Flow 13 — Core files editor (`/core`)

**Where:** `http://localhost:3000/core`

1. Navigate to `/core` (click **Core** in the desktop header or mobile bottom nav).
2. Confirm the page header shows "Core Files" under "Assistant core".
3. Confirm a **Board** link in the header returns to `/`.
4. Confirm the left sidebar lists the whitelisted file names: CORE.md, ASSISTANT.md, TOOLS.md, SKILLS.md, RULES.md, MEMORY.md.
5. Click any file name anchor link — the page scrolls to that file's editor section.
6. Confirm each file section shows a textarea pre-filled with the current file content from `docs/agent-core/`.
7. Edit any file: add a test line at the bottom of a textarea.
8. Click **Save**.
9. Confirm the page reloads (server action triggers `revalidatePath`).
10. Confirm the saved content persists after reload.
11. Remove the test line and save again to restore the file.

**What works:** server-rendered file list, live file read from disk, server action save, path traversal protection (only whitelisted filenames), file size guard, `revalidatePath` on save.

**Known limitation:** no diff preview, no version history, no undo. Saving overwrites directly.

---

## Flow 14 — Navigation between routes

**Where:** any page

| From     | To       | Method                                                                  |
| -------- | -------- | ----------------------------------------------------------------------- |
| `/`      | `/tasks` | Mobile bottom nav "Tasks" tab, or direct URL                            |
| `/`      | `/core`  | Desktop header "Core" link, mobile bottom nav "Core" tab, or direct URL |
| `/core`  | `/`      | "Board" link in `/core` header                                          |
| `/tasks` | `/`      | Browser back button or direct URL                                       |

**What works:** all three routes render without error. Navigation links are wired.

---

## Flow 15 — Responsive layout breakpoints

**Where:** `http://localhost:3000`

Test at these widths using browser DevTools:

| Width              | Expected layout                                           |
| ------------------ | --------------------------------------------------------- |
| 390 px (iPhone)    | Single column, Boards drawer, mobile bottom nav           |
| 768 px (tablet)    | Single column, Boards drawer, mobile bottom nav           |
| 1024 px+ (desktop) | Three-column: sidebar + canvas + assistant, no bottom nav |

1. At 390 px: bottom nav visible, sidebar hidden, drawer toggle visible.
2. At 1024 px: sidebar visible, assistant panel visible, bottom nav hidden, floating Ask AI button visible.

**What works:** Tailwind `lg:` breakpoints applied throughout.

---

## Flows not yet testable (expected gaps at this stage)

These flows are planned but not yet implemented. Do not attempt to test them manually — they will not work:

- **Persistence-backed canvas:** canvas item moves/edits do not save to the database. The canvas loads from hardcoded demo data.
- **Real LLM responses:** the assistant chat does not call any LLM. The local adapter is tested in unit tests only.
- **Tool execution from chat:** `create_board`, `add_canvas_item`, etc. have server-side implementations and unit tests, but the chat UI is not wired to call them.
- **Auth / user identity:** no login flow exists. All pages are public.
- **Telegram bot:** the server-side command handlers (`/boards`, `/tasks`, `/newboard`, `/addnote`) are tested in unit tests. The webhook route and BotFather registration are not configured for live testing.
- **Widget add to canvas from library:** clicking a widget card does nothing.
- **Task create/edit/complete from UI:** tasks page is read-only demo data.
- **Board create from UI "New" button:** button is not wired.
- **Board search:** input is rendered but not functional.
- **Item Edit/Copy/Ask AI/Delete from bottom sheet:** buttons are rendered but have no handlers.
