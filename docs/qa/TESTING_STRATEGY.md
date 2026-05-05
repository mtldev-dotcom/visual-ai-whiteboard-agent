# Testing Strategy

## Check levels

### Static checks

- Typecheck.
- Lint.
- Format.

### Unit tests

Use for:

- Data model helpers.
- Permission logic.
- Tool input validation.
- Widget manifest validation.
- Schedule/reminder helpers.

### Integration tests

Use for:

- Board CRUD.
- Canvas item CRUD.
- Assistant tool execution.
- Telegram command handling.
- Widget runtime policy.

### End-to-end tests

Implemented with Playwright (`@playwright/test`). Browser: Chromium only.

Run with `npm run test:e2e` (requires a running dev server or lets Playwright start one).
Interactive mode: `npm run test:e2e:ui`.

A shared test user (`e2etest@playwright.local`) is created on first run by `tests/e2e/auth.setup.ts` via the signup API. Session cookies are saved to `playwright/.auth/user.json` and reused by all authenticated tests.

Covered flows:

- Unauthenticated redirect to `/login` for `/`, `/tasks`, `/core`.
- Login page rendering, invalid credentials error, and redirect after success.
- Signup page renders form or disabled message depending on `APP_SIGNUP`.
- Board explorer search input visibility.
- Create new board via UI and confirm title appears.
- Board search filters and clears.
- Template picker opens and closes.
- Tasks page renders, creates a task, marks a task complete, cancels form.
- Header navigation to `/tasks` and `/core` and back.
- Sign out redirects to `/login`.
- Core files editor renders file tabs.

Not covered by e2e (manual QA required):

- LLM/assistant tool execution flows (require live OpenRouter key).
- Canvas pan/zoom and item drag/resize feel.
- Mobile bottom sheet (device emulation tests deferred).
- Generated HTML widget sandbox confirmation.
- Telegram account linking and bot commands.

### Manual QA

Required for:

- Mobile canvas feel.
- Pan/zoom usability.
- Generated HTML widget confirmation.
- Telegram account linking.
- Permission prompts.
- All assistant chat tool call flows.
