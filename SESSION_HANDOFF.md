# Latest Session Handoff

Date: 2026-05-04

## Summary

Added an environment-controlled signup gate. New account creation is enabled by default, but setting `APP_SIGNUP=disable` disables the signup UI and blocks direct signup API requests while keeping login available for existing users.

## What changed

- Added `src/lib/signup.ts` with shared signup availability logic.
- Updated `POST /api/auth/signup` to return `403` when signup is disabled.
- Split login and signup forms into client components so their pages can read server environment at request time.
- Marked `/login` and `/signup` as dynamic routes so production env changes are not baked into static HTML.
- `/signup` now shows a disabled state when signup is off.
- `/login` hides the "Create one" link when signup is off.
- Added unit coverage for `APP_SIGNUP` behavior.
- Documented `APP_SIGNUP=enable` / `APP_SIGNUP=disable` in local, deployment, QA, and user-flow docs.

## Files changed this session

- `.env.example`
- `README.md`
- `CURRENT_STATUS.md`
- `TODO.md`
- `SESSION_HANDOFF.md`
- `docs/deployment/DOKPLOY_HETZNER.md`
- `docs/qa/MANUAL_QA.md`
- `docs/user-flow-guide.md`
- `src/app/api/auth/signup/route.ts`
- `src/app/login/LoginForm.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/SignupForm.tsx`
- `src/app/signup/page.tsx`
- `src/lib/signup.ts`
- `src/lib/signup.test.ts`

## Checks run

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test -- --run`: passed, 57 tests
- `npm run docs:check`: passed
- `npm run build`: passed

## Checks skipped

- Manual browser QA was not run.
- Live production/Dokploy verification was not run.

## Known issues

- Existing uncommitted changes from earlier work are still present in the worktree and were not reverted.
- To apply a changed `APP_SIGNUP` value in a deployed container, update the environment and restart/redeploy the app.

## Next recommended task

Create the first production account with signup enabled, then set `APP_SIGNUP=disable` in production and verify `/signup`, `/login`, and direct `POST /api/auth/signup` behavior against the deployed domain.
