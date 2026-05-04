# 54 — Design Tokens

The app uses a CSS custom property (CSS variable) system for all visual styling. Every color, shadow, border radius, and font is defined as a design token — not hardcoded in component files. This chapter explains the token architecture.

## Files referenced

- `src/app/globals.css` — all design tokens, base styles, animations

## Token philosophy

The design system follows a semantic naming convention. Tokens are named by **what they represent** (purpose), not **what they look like** (value). This is critical for theming — a component references `var(--bg-surface)` and gets the correct color regardless of whether the theme is light or dark.

**Wrong (non-semantic):** `.card { background: #ffffff; }` — in dark mode this would be jarringly bright.

**Right (semantic):** `.card { background: var(--bg-surface); }` — the token resolves to the correct surface background for the active theme.

## Token categories

### Background tokens (`--bg-*`)

Base backgrounds for the app's z-index layers:

```css
:root {
  --bg-app:     #eeecea;     /* App background — the base layer visible behind all content */
  --bg-surface: #ffffff;     /* Surface/card background — elevated above app background */
  --bg-sidebar: #f8f7f5;     /* Sidebar panel background — slightly distinct from surface */
  --bg-canvas:  #f0efed;     /* Canvas grid background — the infinite drawing surface */
  --bg-elevated: #ffffff;    /* Highest elevation — modals, popovers, dropdowns */
  --bg-overlay: rgba(0,0,0,0.45); /* Overlay/backdrop — dims content behind drawers and modals */
}
```

Dark mode equivalents:

```css
.dark {
  --bg-app:     #0c0c0d;
  --bg-surface: #1c1c1f;
  --bg-sidebar: #161618;
  --bg-canvas:  #111113;
  --bg-elevated: #242428;
  --bg-overlay: rgba(0,0,0,0.65);
}
```

**Why five background colors.** Each background token maps to a specific UI layer:
- `--bg-app` — The page background behind everything. Usually only visible at the edges.
- `--bg-surface` — Cards, panels, drawers. Slightly elevated from the app background.
- `--bg-sidebar` — The left and right panels (BoardExplorer, AssistantPanel). Slightly distinct from the main surface to create visual separation.
- `--bg-canvas` — The whiteboard canvas background with grid dots. Must contrast clearly with the items placed on it.
- `--bg-overlay` — Semi-transparent dark overlay that dims the background when a drawer or modal is open.

### Text tokens (`--text-*`)

A three-level hierarchy for text contrast:

```css
:root {
  --text-1: #18181b;   /* Primary text — headings, body text, important labels */
  --text-2: #71717a;   /* Secondary text — descriptions, metadata, less important info */
  --text-3: #a1a1aa;   /* Tertiary text — hints, placeholders, disabled text */
}

.dark {
  --text-1: #f4f4f5;
  --text-2: #a1a1aa;
  --text-3: #52525b;
}
```

**Why numeric naming (1/2/3).** The numbers encode the visual hierarchy: 1 = most prominent, 3 = least prominent. This is more maintainable than naming by color (e.g., `--text-primary`, `--text-muted`) because the hierarchy would be the same regardless of the color values.

| Token | Light value | Dark value | Typical usage |
|-------|-----------|------------|---------------|
| `--text-1` | Near-black | Near-white | Board titles, card headings, body text |
| `--text-2` | Mid gray | Lighter gray | Board chrome text, descriptions, icons |
| `--text-3` | Light gray | Dim gray | Section labels, placeholders, disabled states |

### Accent tokens (`--accent*`)

The brand's primary color family:

```css
:root {
  --accent:             #2f5d50;   /* Primary accent — buttons, links, active states */
  --accent-hover:       #245044;   /* Accent hover state — 10-15% darker than accent */
  --accent-fg:          #ffffff;   /* Accent foreground — text on accent backgrounds */
  --accent-light:       #e6f0ec;   /* Accent light variant — selected items, tags, subtle highlights */
  --accent-light-hover: #d4e8e0;   /* Accent light hover state */
}

.dark {
  --accent:             #34d399;   /* Teal green — brighter for dark backgrounds */
  --accent-hover:       #6ee7b7;
  --accent-fg:          #052e16;   /* Dark green — readable on light accent */
  --accent-light:       #064e3b;   /* Dark green tint — subtle accent on dark surfaces */
  --accent-light-hover: #065f46;
}
```

**Why the accent changes so dramatically between themes.** In light mode, `--accent` is a deep forest green (`#2f5d50`) — it needs sufficient contrast against white surfaces. In dark mode, the same deep green would be invisible against dark backgrounds, so the accent becomes a vibrant teal (`#34d399`). The `--accent-fg` inverts accordingly — white text in light mode, dark text in dark mode.

**Important:** Never use the hex value of the accent directly. Always use `var(--accent)`. This makes theme changes instant and consistent.

### Border tokens (`--border*`)

```css
:root {
  --border:        #e2dfd8;   /* Main border — card borders, separators, input outlines */
  --border-strong: #cac6bc;   /* Strong border — scrollbar thumbs, active input borders */
}

.dark {
  --border:        #2c2c30;
  --border-strong: #3c3c42;
}
```

Two levels of border color: the main border is subtle (almost blending with the background), and the strong border provides more contrast for interactive elements.

### Shadow tokens (`--shadow-*`)

```css
:root {
  --shadow-sm:   0 1px 2px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.04);
  --shadow-md:   0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
  --shadow-lg:   0 4px 20px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06);
  --shadow-card: 0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04);
}

.dark {
  --shadow-sm:   0 1px 2px rgba(0,0,0,0.3);
  --shadow-md:   0 2px 8px rgba(0,0,0,0.4);
  --shadow-lg:   0 4px 20px rgba(0,0,0,0.5);
  --shadow-card: 0 4px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06);
}
```

**Why shadows get darker in dark mode, not lighter.** Shadows in dark mode need to feel like "further below" the surface. Making them more intense (higher opacity, not lower) achieves this. In light mode, the app background is already light, so shadows are subtle. In dark mode, they must be deeper to create depth perception.

### Canvas tokens (`--canvas-*`)

Used exclusively for the `.canvas-surface` grid pattern:

```css
:root {
  --canvas-dot:  rgba(0,0,0,0.22);       /* Grid dots */
  --canvas-line: rgba(0,0,0,0.055);      /* Grid lines */
}

.dark {
  --canvas-dot:  rgba(255,255,255,0.14);
  --canvas-line: rgba(255,255,255,0.04);
}
```

### Danger tokens (`--danger*`)

Error and destructive action colors:

```css
:root {
  --danger:       #dc2626;   /* Red — error messages, delete buttons */
  --danger-fg:    #ffffff;   /* Foreground text on danger backgrounds */
  --danger-light: #fef2f2;   /* Light red — subtle error backgrounds */
}

.dark {
  --danger:       #f87171;
  --danger-fg:    #450a0a;
  --danger-light: #1c0606;
}
```

### Radius tokens (`--radius-*`)

Border radius values — centralized for consistency:

```css
:root {
  --radius-sm:   6px;    /* Small: input borders, inline buttons */
  --radius:      8px;    /* Default: cards, panels, the "standard" radius */
  --radius-lg:   12px;   /* Large: modals, drawers, prominent cards */
  --radius-xl:   16px;   /* Extra large: full-width bottom sheets */
  --radius-full: 9999px; /* Pill: avatars, badges, tags */
}
```

These do NOT change between themes — border radius is a layout property, not a color property.

### Font tokens (`--font-*`)

```css
:root {
  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}
```

These reference the CSS variables set by Next.js font optimization in `layout.tsx`. The `system-ui` fallback ensures text renders even if the web fonts fail to load.

## Canvas grid system

The canvas surface uses a dot-grid background defined via CSS backgrounds:

```css
.canvas-surface {
  background-color: var(--bg-canvas);
  background-image:
    radial-gradient(circle, var(--canvas-dot) 1.5px, transparent 1.5px),
    linear-gradient(var(--canvas-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--canvas-line) 1px, transparent 1px);
  background-size: 32px 32px, 32px 32px, 32px 32px;
}
```

Three gradients layer the grid:
1. **Dot pattern** — 1.5px radius dots using `--canvas-dot` color, spaced on a 32px grid. This creates the primary visual anchor.
2. **Horizontal lines** — 1px lines using `--canvas-line` color, also on a 32px grid. Subtler than the dots.
3. **Vertical lines** — Same as horizontal, rotated 90 degrees.

All three layers use `background-size: 32px 32px` to stay aligned. This 32px grid matches the position defaults in the canvas items API (`x: 32, y: 32`).

**Why a dot-grid instead of a blank canvas.** The grid provides spatial anchoring — users can perceive distance and alignment visually. The 32px grid size is chosen to match default item sizes and snapping behavior.

## Theme application

The `.dark` class on `<html>` controls which token set is active. This is managed by the `ThemeProvider` component (see chapter 55):

```typescript
document.documentElement.classList.toggle("dark", theme === "dark");
```

CSS uses the `@custom-variant` directive (Tailwind v4) to make `dark:` variants work:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

**Why manual toggle instead of `prefers-color-scheme` only.** The user can explicitly choose light or dark mode, overriding their system preference. The initial page load respects `prefers-color-scheme`, but the toggle persists the user's choice to `localStorage`.

## Component usage patterns

Components use `style` attributes with `var()` references:

```typescript
// src/app/components/WorkspaceShell.tsx
style={{
  background: "var(--bg-surface)",
  borderColor: "var(--border)",
  boxShadow: "var(--shadow-sm)",
}}
```

**Why inline `style` instead of Tailwind classes for colors.** Tailwind v4 is used for layout (`flex`, `h-dvh`, `gap-3`, `p-3`), sizing, and utility classes. Design tokens are used for colors, shadows, and semantic styling. This split gives the best of both worlds:

- **Tailwind** → Rapid layout, responsive breakpoints, spacing, typography utilities
- **Design tokens** → Consistent, themeable colors and shadows

Mixing them prevents the common Tailwind problem of a component having 20+ class names for colors and shadows that would all need to change in a redesign.

## Adding a new token

1. Add the CSS custom property in `:root` under the appropriate category
2. Add corresponding `.dark` values
3. Use `var(--new-token)` in components via inline `style` attributes

**Do not** add raw hex values to component `style` objects. A single hardcoded color breaks theming for that component in dark mode.

## Token naming conventions

- **Two-letter prefix + dash** — `bg-`, `text-`, `accent*`, `border*`, `shadow-`, `canvas-`, `radius-`, `font-`
- **Kebab-case** — all lowercase with hyphens (e.g., `--accent-light-hover`)
- **Numbered hierarchy** — for text contrast levels (`--text-1`, `--text-2`, `--text-3`)
- **Semantic, not visual** — `--bg-surface` not `--color-white`, `--text-2` not `--color-gray-500`

This system ensures the entire app can be restyled by changing tokens in one file, without touching any component code.
