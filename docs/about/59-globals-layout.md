# 59 — Globals, Layout, and Providers

This chapter covers the app's root-level files that establish the styling foundation, the HTML structure, and the React context hierarchy.

## Files referenced

- `src/app/globals.css` — 179 lines of global styles
- `src/app/layout.tsx` — 36-line root layout
- `src/app/providers.tsx` — 13-line provider wrapper
- `public/favicon.ico` — The app's icon

## globals.css — The styling foundation

`src/app/globals.css` is the only global CSS file in the application. All component-specific styles use Tailwind utility classes and design token `style` attributes — there are no component-level CSS files.

### Structure

```
┌─────────────────────────────────────────┐
│ @import "tailwindcss"                   │ ← Tailwind v4
├─────────────────────────────────────────┤
│ @custom-variant dark (...)              │ ← Dark mode variant definition
├─────────────────────────────────────────┤
│ :root { ... }                           │ ← Light design tokens
│ .dark { ... }                           │ ← Dark design token overrides
├─────────────────────────────────────────┤
│ .canvas-surface { ... }                 │ ← Canvas grid pattern
├─────────────────────────────────────────┤
│ Global base styles (*, html, body,      │
│   button, input, select, textarea)      │
├─────────────────────────────────────────┤
│ ::-webkit-scrollbar (custom scrollbar)  │
├─────────────────────────────────────────┤
│ @keyframes (slide-up, fade-in,          │
│   scale-in) + .animate-* classes       │
└─────────────────────────────────────────┘
```

### Section 1: Tailwind import and dark mode

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

**Tailwind v4.** Uses the new `@import` syntax (not the v3 `@tailwind base; @tailwind components; @tailwind utilities;`). Tailwind v4 is configured via CSS, not `tailwind.config.js`.

**Custom dark variant.** The `dark:` variant in Tailwind is configured to match elements that have the `.dark` class (or are descendants of a `.dark` element). This enables `dark:bg-black` style utility classes, but the project primarily uses design tokens for colors instead.

The `:where()` pseudo-class ensures zero specificity — the dark variant doesn't accidentally override other styles.

### Section 2: Design tokens

```css
:root {
  --bg-app: #eeecea;
  --bg-surface: #ffffff;
  --bg-sidebar: #f8f7f5;
  --bg-canvas: #f0efed;
  /* ... full token set ... */
}

.dark {
  --bg-app: #0c0c0d;
  --bg-surface: #1c1c1f;
  /* ... dark overrides ... */
}
```

> Full token documentation is in chapter 54. This section covers how `globals.css` structures them.

Tokens are organized in logical groups with blank-line separators:
1. Background tokens (`--bg-*`)
2. Border tokens (`--border*`)
3. Text tokens (`--text-*`)
4. Accent tokens (`--accent*`)
5. Danger tokens (`--danger*`)
6. Canvas tokens (`--canvas-*`)
7. Shadow tokens (`--shadow-*`)
8. Radius tokens (`--radius-*`)
9. Font tokens (`--font-*`)

The `.dark` block mirrors the `:root` block with the same property order, making it easy to verify completeness — every `:root` token must have a `.dark` counterpart.

### Section 3: Canvas grid

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

Three layers composited via CSS backgrounds:
1. **Dot grid** (top layer): 1.5px radius dots every 32px using `--canvas-dot`
2. **Horizontal lines** (middle): 1px lines every 32px using `--canvas-line`
3. **Vertical lines** (bottom): Same as horizontal, rotated 90 degrees

All three use `background-size: 32px 32px` for perfect alignment. The class is applied to the canvas element in `BoardCanvas.tsx`.

**Why CSS grid, not SVG or canvas.** A CSS background grid is zero JavaScript, GPU-accelerated, and automatically repaints on scroll/zoom. It's the lightest possible implementation.

### Section 4: Global base reset

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  height: 100%;
}

body {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-app);
  color: var(--text-1);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

button,
input,
select,
textarea {
  font: inherit;
}
```

**box-sizing: border-box.** Universal border-box reset. Prevents padding from expanding element dimensions. Standard in modern CSS resets.

**html height 100% + body min-height 100%.** Ensures the body fills the viewport even with short content. The `display: flex` and `flex-direction: column` on body allow the app to stretch children vertically.

**font: inherit on form elements.** Without this, buttons and inputs use browser-default fonts that don't match the design system. Overriding with `inherit` makes them use the body's font family.

**antialiased.** `-webkit-font-smoothing: antialiased` renders text with subpixel antialiasing on macOS/iOS, making light-on-dark text (and dark-on-light text) look sharper.

### Section 5: Custom scrollbar

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-3);
}
```

A 6px thin scrollbar with rounded thumb. Uses design tokens (`--border-strong` for default, `--text-3` for hover) so it adapts to the current theme.

**WebKit only.** `::-webkit-scrollbar` works in Chrome, Edge, Safari, and Opera. Firefox does not support custom scrollbar styling via this pseudo-element. The native Firefox scrollbar is the fallback.

### Section 6: Animation keyframes

```css
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

.animate-slide-up  { animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
.animate-fade-in   { animation: fade-in 0.15s ease; }
.animate-scale-in  { animation: scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1); }
```

Three animations, each with a dedicated utility class:

| Class | Keyframe | Duration | Easing | Usage |
|-------|----------|----------|--------|-------|
| `animate-slide-up` | `slide-up` | 250ms | Spring-like (0.32, 0.72, 0, 1) | Mobile drawers |
| `animate-fade-in` | `fade-in` | 150ms | Linear | Overlay backdrops |
| `animate-scale-in` | `scale-in` | 150ms | Overshoot (0.16, 1, 0.3, 1) | Popovers, forms |

**Why custom animations instead of Tailwind's.** Tailwind v4 provides `animate-*` utilities, but custom cubic-bezier curves for iOS-like feel require explicit keyframes. The `slide-up` curve `(0.32, 0.72, 0, 1)` is modeled after iOS's default spring animation for sheet presentations.

## layout.tsx — The HTML shell

`src/app/layout.tsx` is the Next.js root layout. It defines the outer HTML structure that wraps every page.

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visual AI Whiteboard",
  description: "Mobile-first AI assistant workspace for structured boards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Font loading

Geist Sans and Geist Mono are loaded via `next/font/google`:

```typescript
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

**Why Geist.** Geist is Vercel's design system font, optimized for UI. It renders crisply at small sizes and has excellent legibility. The variable font file is automatically subset to Latin characters by Next.js, keeping the bundle small.

**CSS variable approach.** Setting `variable: "--font-geist-sans"` makes Next.js inject the font name into a CSS custom property. The design token system references this:

```css
--font-sans: var(--font-geist-sans), system-ui, sans-serif;
--font-mono: var(--font-geist-mono), ui-monospace, monospace;
```

This way components never reference the font directly — they use `font-family: var(--font-sans)`.

### Metadata

```typescript
export const metadata: Metadata = {
  title: "Visual AI Whiteboard",
  description: "Mobile-first AI assistant workspace for structured boards.",
};
```

The metadata object is used by Next.js to generate `<title>`, `<meta name="description">`, and Open Graph tags. No viewport meta tag is needed — Next.js adds it automatically for App Router.

### HTML structure

```tsx
<html
  lang="en"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
```

- `lang="en"` — accessibility and SEO
- `geistSans.variable` / `geistMono.variable` — inject font CSS variables (Next.js populates these)
- `h-full` — ensures full-height rendering
- `antialiased` — font smoothing

```tsx
<body className="min-h-full flex flex-col">
  <Providers>{children}</Providers>
</body>
```

- `min-h-full` — minimum full height
- `flex flex-col` — vertical flex layout, enabling the app to stretch

**Why these classes are on `<html>` and `<body>`.** The `<html>` element must be full height for `min-h-full` on `<body>` to work. The `flex flex-col` on body ensures the app content can fill the viewport using `flex-1` on child containers.

## providers.tsx — React context wrapper

`src/app/providers.tsx` wraps the entire application with two providers:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./components/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
```

### SessionProvider (next-auth/react)

`SessionProvider` from `next-auth/react` provides authentication context to all client components. It enables `useSession()` and `signOut()` in any component.

Key behaviors:
- Automatically refreshes the session at intervals
- Handles session expiry
- Provides the `signOut()` function
- Syncs session state across tabs

**Why `"use client"`.** Both `SessionProvider` and `ThemeProvider` require browser APIs. The entire `Providers` component is a client boundary — everything inside it can use client-side React features.

### Provider order

`SessionProvider` is outermost. This means session context is available inside `ThemeProvider` and all children. The order:
```
<SessionProvider>         ← Auth context
  <ThemeProvider>         ← Theme context (has access to session)
    {children}            ← App pages (has access to both)
  </ThemeProvider>
</SessionProvider>
```

In practice, `ThemeProvider` does not use session data. The order is a convention — auth at the top establishes the user context before any UI customization.

**What is NOT in providers.** Currently only two providers. If future features add more context providers (e.g., a workspace settings provider, a real-time sync provider), they would be added here. The rule is:

- **Goes in providers.tsx** if it wraps the entire app and all pages need it
- **Goes in a page-specific layout** if only certain routes need it

## favicon.ico — App icon

The favicon at `public/favicon.ico` is the app's "W" icon — a stylized "W" for "Whiteboard." It appears in:
- Browser tabs
- Bookmarks
- Mobile home screen (when added as a PWA-like shortcut)
- Link previews

No explicit `<link>` tag is needed — Next.js automatically serves `favicon.ico` from the `public` directory.

## How the files connect

```
layout.tsx
  │
  ├─ Imports globals.css          ← All global styles loaded
  ├─ Loads Geist fonts             ← Font CSS variables set
  ├─ Sets metadata                 ← Page title/description
  └─ Renders providers.tsx         ← Wraps children
       │
       ├─ SessionProvider          ← NextAuth session context
       └─ ThemeProvider            ← Light/dark theme context
            └─ {children}          ← Page components
                 └─ WorkspaceShell ← Main app
                      └─ Uses var(--bg-*), var(--text-*), etc.
```

The entire styling pipeline:

1. `layout.tsx` imports `globals.css` → CSS custom properties defined in `:root` and `.dark`
2. `ThemeProvider` toggles `<html class="dark">` → `.dark` overrides activate
3. Components use `style={{ background: "var(--bg-surface)" }}` → resolve to current theme value
4. Tailwind provides layout utilities (`flex`, `h-dvh`, `gap-3`, etc.)

No CSS-in-JS runtime. No styled-components. No SCSS. One global CSS file with CSS custom properties + Tailwind v4 utilities.
