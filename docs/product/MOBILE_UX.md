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

Canvas toolbar on mobile:

- Vertical strip pinned to the right edge of the canvas, vertically centered.
- All tools accessible: navigate, draw, create, tidy, upload, zoom, color palette.
- Scrollable if screen height is too short to show all buttons.
- Shape sub-kind panel floats to the left of the main strip when Shape tool is active.
- On desktop (`md:` and above) the toolbar reverts to the standard horizontal bottom bar.

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
