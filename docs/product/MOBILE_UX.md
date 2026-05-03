# Mobile UX Requirements

## Principle

The app must feel native to mobile. Do not shrink a desktop whiteboard into a phone screen.

## Primary mobile navigation

Recommended bottom nav:

- Chat
- Board
- Widgets
- Tasks
- Menu

## Board screen

Top area:

- Board name.
- Search.
- Board menu.

Main area:

- Pan/zoom canvas.

Bottom/floating controls:

- Add button.
- Ask AI button.
- Selected item bottom sheet.

## Board explorer

On desktop:

- Sidebar tree.

On mobile:

- Slide-out drawer.
- Search at top.
- Recent boards.
- Nested board list.

## Selected object behavior

When a user taps an object:

- Highlight selected object.
- Open bottom sheet.
- Show contextual actions.
- Allow "Ask AI about this."
- Allow full-screen editing for complex widgets.

## Chat and canvas relationship

Mobile should support two modes:

### Chat-first

Best for creating from scratch.

- Chat is primary.
- Board previews appear as cards.
- User can open board after creation.

### Board-first

Best for editing.

- Canvas is primary.
- Assistant floats as button or bottom drawer.

## Accessibility

- Touch targets should be comfortable.
- Text must be readable at common phone widths.
- Color cannot be the only signal.
- Keyboard navigation should work where practical.
- Loading and error states must be visible and understandable.
