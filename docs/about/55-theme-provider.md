# 55 — Theme Provider

The `ThemeProvider` manages the application's light/dark theme state, persisting user preference and applying the correct CSS class to the document root.

## Files referenced

- `src/app/components/ThemeProvider.tsx` — React context provider (49 lines)
- `src/app/providers.tsx` — App-level provider wrapper
- `src/app/layout.tsx` — Root layout that renders Providers
- `src/app/globals.css` — `.dark` class token overrides (see chapter 54)

## Architecture

The theme system has three layers:

1. **CSS layer** — Design tokens in `globals.css` with `.dark` overrides (chapter 54)
2. **JavaScript layer** — `ThemeProvider` React context that tracks state and toggles the `<html class="dark">`
3. **Persistence layer** — `localStorage` for user preference, `prefers-color-scheme` for system default

## Implementation

```typescript
// src/app/components/ThemeProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
    setTheme(initial);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Initialization sequence

When the app first loads (the `useEffect` on mount):

```
1. Check localStorage.getItem("theme")
   ├─ Exists ("light" or "dark") → Use stored preference
   └─ No stored value → Fall through

2. Check window.matchMedia("(prefers-color-scheme: dark)")
   ├─ true → Use "dark"
   └─ false → Use "light"

3. Apply to DOM:
   document.documentElement.classList.toggle("dark", theme === "dark")

4. Set state:
   setTheme(initial)
```

**Why check localStorage first.** The user's explicit choice should always override the system preference. If the user chose "light" in a previous session, the system preference should not override that choice.

## Toggle function

The `toggle()` function does three things atomically:

```typescript
function toggle() {
  setTheme((prev) => {
    const next: Theme = prev === "dark" ? "light" : "dark";
    // 1. Persist to localStorage
    localStorage.setItem("theme", next);
    // 2. Update DOM immediately (before React re-render)
    document.documentElement.classList.toggle("dark", next === "dark");
    // 3. Update React state (triggers re-render)
    return next;
  });
}
```

**Why write to localStorage AND toggle the class in the same callback.** If the class toggle were done outside the `setTheme` callback, there would be a brief flash where the state is "dark" but the DOM class is "light" (or vice versa). By doing both in the state updater, the DOM is updated synchronously at the moment React commits the new state.

**Why use a functional updater (`prev =>`).** The functional form of `setTheme` guarantees that `prev` is the current state, avoiding stale state issues if `toggle()` is called rapidly.

## Context API

The context exposes only `theme` and `toggle`, not `setTheme`:

```typescript
const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });
```

Components never call `setTheme` directly — they always use `toggle()`. This prevents components from setting invalid theme values or from setting a theme without persisting it and updating the DOM class.

Components consume the theme via the `useTheme()` hook:

```typescript
const { theme, toggle: toggleTheme } = useTheme();
```

### Usage example (from WorkspaceShell)

```typescript
// src/app/components/WorkspaceShell.tsx:39
const { theme, toggle: toggleTheme } = useTheme();

// Later, in the header:
<button
  onClick={toggleTheme}
  title={theme === "dark" ? "Light mode" : "Dark mode"}
>
  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
</button>
```

## Provider hierarchy

The `ThemeProvider` is nested inside the `SessionProvider` in `providers.tsx`:

```typescript
// src/app/providers.tsx
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

`Providers` wraps the entire app via `layout.tsx`:

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Why SessionProvider wraps ThemeProvider.** Order matters when providers depend on each other. ThemeProvider does not depend on SessionProvider, but SessionProvider is a higher-level app concern. Either order would work in this case, but wrapping SessionProvider outermost is the convention — authentication context is available to everything inside it.

## What the Provider does NOT do

- **Does NOT prevent flash of unstyled content (FOUC).** When the page first loads, the HTML is rendered without the `.dark` class, then the `useEffect` runs and adds it. This brief flash is minimal because the CSS tokens are instant. For complete FOUC prevention, a blocking `<script>` in the `<head>` would be needed, but this adds complexity for marginal benefit.
- **Does NOT listen for system preference changes.** If the user changes their OS theme while the app is open, the app does not auto-switch — it respects the stored explicit preference. This is intentional: the explicit choice wins.
- **Does NOT support more than two themes.** The type is `"light" | "dark"`. Adding a third theme would require changes to the context, the initialization logic, the toggle function, and all design token definitions.

## Client component requirement

`"use client"` at the top of the file is mandatory. The component uses:
- `useState` and `useEffect` (React hooks)
- `localStorage` (browser API)
- `window.matchMedia` (browser API)
- `document.documentElement` (DOM API)

None of these are available on the server. The `ThemeProvider` must be a client component, and it is loaded within `Providers` which is also `"use client"`.

## Theme toggle UI locations

The theme toggle button appears in two places:
1. **Desktop header** — Sun/Moon icon in the top bar (always visible on desktop)
2. **Mobile header** — Same icon in the compact 44px header bar

Both use the same `useTheme()` hook and call the same `toggleTheme` function. There is one source of truth for the current theme.
