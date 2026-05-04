# Latest Session Handoff

Date: 2026-05-04

## Summary

Removed the duplicate `notes` creation surface. Sticky notes and notes both stored a title plus text; the only meaningful difference was visual styling and default size. New boards, toolbar actions, widgets, API calls, and assistant tool calls now use `sticky_note` for note capture.

## What changed

- Removed the Notes toolbar tool and `N` shortcut.
- Removed the Notes widget card from the widget library.
- Removed `notes` from user-facing and assistant/API creation allowlists.
- Added assistant tool validation so `add_canvas_item` rejects removed `notes` item creation.
- Updated onboarding and Project Kickoff template note items to use `sticky_note`.
- Kept legacy `notes` rendering in `BoardCanvas` so existing boards do not break.
- Updated docs and status notes.

## Files changed this session

- `CURRENT_STATUS.md`
- `TODO.md`
- `SESSION_HANDOFF.md`
- `docs/architecture/WIDGET_RUNTIME.md`
- `docs/implementation/PHASES.md`
- `docs/qa/MANUAL_QA.md`
- `docs/user-flow-guide.md`
- `src/app/api/canvas-items/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/components/BoardCanvas.tsx`
- `src/app/components/CanvasToolbar.tsx`
- `src/app/components/WidgetLibrary.tsx`
- `src/server/assistant/canvas-tools.test.ts`
- `src/server/assistant/canvas-tools.ts`
- `src/server/board-templates.ts`
- `src/server/onboarding.ts`

## Checks run

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test -- --run`: passed, 58 tests
- `npm run docs:check`: passed
- `npm run build`: passed

## Checks skipped

- Browser/manual QA was not run.

## Known issues

- Existing boards may still contain old `notes` canvas items; they remain renderable as legacy items.

## Next recommended task

Run a quick browser check that the toolbar no longer shows Notes and the widget library only offers Task List and Kanban.
