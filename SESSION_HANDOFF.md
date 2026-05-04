# Latest Session Handoff

Date: 2026-05-04

## Summary

Fixed a production assistant runtime failure after the Dokploy deploy succeeded. Assistant chat loads Markdown core files from `docs/agent-core` at runtime, but the Docker runner image did not include that folder, causing `ENOENT: no such file or directory, open '/app/docs/agent-core/ASSISTANT.md'`.

## What changed

- Updated `Dockerfile` to copy `docs/agent-core` into the production runner image.
- Updated the Dokploy guide to document that runtime core files are included.
- Updated deployment status notes.

## Files changed this session

- `Dockerfile`
- `CURRENT_STATUS.md`
- `TODO.md`
- `SESSION_HANDOFF.md`
- `docs/deployment/DOKPLOY_HETZNER.md`

## Checks run

- `docker build -t visual-ai-whiteboard-agent:test .`: passed
- `docker run --rm --entrypoint node visual-ai-whiteboard-agent:test -e "...ASSISTANT.md exists..."`: passed
- `npm run docs:check`: passed

## Checks skipped

- Live Dokploy redeploy was not run from this workspace.
- Browser/manual QA was not run.

## Known issues

- `npm audit` still reports existing moderate advisories during Docker dependency install. Do not apply `npm audit fix --force` without review.
- Dokploy must be redeployed after this fix so the new image includes `docs/agent-core`.

## Next recommended task

Redeploy in Dokploy, then send a test assistant message and verify `/core` opens without file-not-found errors.
