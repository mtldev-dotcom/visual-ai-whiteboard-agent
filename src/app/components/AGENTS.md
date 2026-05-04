# App Components Contract

This folder owns route-local UI components for the App Router shell.

Rules:

- Keep components mobile-first and touch-friendly.
- Use client components only when browser interaction is required.
- Keep demo data clearly local until real services are wired.
- Move cross-feature components out of this folder once reused outside the app shell.
- Do not place database writes or assistant tool execution in UI components.
