# App Router Contract

This folder owns the Next.js App Router entry points, layouts, route handlers, and global styles.

Rules:

- Keep routes mobile-first by default.
- Prefer server components unless client interactivity is required.
- Keep global CSS limited to design tokens, base element rules, and app-wide utilities.
- Do not put persistence, assistant tool execution, or Telegram logic directly in page components.
- Move shared UI into `src/components/` or feature folders once components become reusable.
- Update README, implementation docs, and handoff notes when route behavior or scripts change.
