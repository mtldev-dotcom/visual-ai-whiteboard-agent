# Dokploy + Hetzner Test Deploy

This guide deploys the app to a Hetzner VPS managed by Dokploy using the repository `Dockerfile`.

## What Is Ready

- `Dockerfile` builds the Next.js app and generated Prisma client.
- The deploy image uses Node.js 22 on Debian slim with OpenSSL installed for Prisma.
- The runtime image includes `docs/agent-core` because assistant chat loads Markdown core files at runtime.
- Container starts with `npm run start:deploy`.
- `start:deploy` runs `prisma migrate deploy` before `next start`.
- App listens on port `3000`.
- Public health check: `/api/health`.
- Protected app routes still require login.

## Requirements

- Hetzner VPS with Dokploy installed.
- A domain or subdomain pointing to the VPS.
- A PostgreSQL database created in Dokploy or reachable from the app container.
- GitHub repository connected to Dokploy.

## 1. Create The Database

In Dokploy, create a PostgreSQL service for this app.

Use a strong database password. For a test deploy, name the database something like:

```text
visual_whiteboard_ai
```

After the database is created, copy the internal connection string that the app container can use. It should look similar to:

```text
postgresql://USER:PASSWORD@HOST:5432/visual_whiteboard_ai
```

Do not use the local development URL from `docker-compose.yml` in Dokploy.

## 2. Create The App

In Dokploy:

1. Create a new application.
2. Select this GitHub repository.
3. Use Dockerfile deployment.
4. Dockerfile path:

```text
Dockerfile
```

5. Set exposed/container port:

```text
3000
```

6. Set health check path if Dokploy asks for one:

```text
/api/health
```

## 3. Set Environment Variables

Set these in the Dokploy app environment.

Required:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/visual_whiteboard_ai
AUTH_SECRET=<generate-a-long-random-secret>
APP_ENCRYPTION_KEY=<generate-a-32-byte-secret>
NEXTAUTH_URL=https://your-domain.example
APP_URL=https://your-domain.example
APP_SIGNUP=enable
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=<your-openrouter-api-key>
OPENROUTER_MODEL=anthropic/claude-3-haiku
```

Generate `AUTH_SECRET` locally with:

```bash
openssl rand -base64 32
```

Generate `APP_ENCRYPTION_KEY` the same way. It encrypts user-owned BotFather tokens at rest.

Optional fallback for no real LLM during first deploy:

```bash
LLM_PROVIDER=local
OPENROUTER_API_KEY=
```

Optional signup lock after creating the initial account:

```bash
APP_SIGNUP=disable
```

When disabled, `/signup` shows a disabled state, the login page hides the create-account link, and `POST /api/auth/signup` returns `403`.

## 4. Deploy

Trigger a deploy in Dokploy.

Expected startup behavior:

1. Docker build installs dependencies.
2. Prisma client is generated and copied into the Next.js build stage.
3. Next.js production build runs.
4. Runtime image includes `.next`, Prisma files, generated Prisma client, and `docs/agent-core`.
5. On container start, `prisma migrate deploy` applies migrations.
6. `next start -H 0.0.0.0` starts the app on port `3000`.

If startup fails, check the app logs first. Most first-deploy failures are bad `DATABASE_URL`, missing `AUTH_SECRET`, or incorrect `NEXTAUTH_URL`.

If the logs show Nixpacks selecting Node.js 18, the app is not using the repository `Dockerfile`. Switch the Dokploy build type to Dockerfile deployment or configure Nixpacks to use Node.js 22.

## 5. Verify The App

Open:

```text
https://your-domain.example/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "visual-ai-whiteboard-agent"
}
```

Then test:

1. Open `https://your-domain.example/signup`.
2. Create a test account.
3. Confirm you land on `/`.
4. Confirm the Welcome Board is created.
5. Ask the assistant to add a sticky note.
6. Refresh and confirm the board and chat persist.
7. Ask the assistant what it can see on the board and confirm it describes actual canvas items.
8. Ask it to delete the new note and confirm the note disappears.

After the initial account exists, you may set `APP_SIGNUP=disable`, redeploy/restart the app, and confirm `/signup` no longer allows account creation while `/login` still works.

## 6. Optional Telegram Bot Connection

Only do this after the app is reachable over HTTPS.

1. Confirm `APP_URL` and `APP_ENCRYPTION_KEY` are set.
2. Sign in and open `/settings`.
3. Create a bot in BotFather with `/newbot`.
4. Paste the token and click **Connect token**.
5. Send `/start` to the new bot.
6. Paste the returned Telegram ID in Settings and click **Connect ID**.

Telegram will send updates to a bot-specific URL:

```text
https://your-domain.example/api/telegram/webhook/[connectionId]
```

## Rollback

For a test deploy, rollback from Dokploy to the previous successful deployment.

Database migrations are forward-only. Do not manually edit production database tables. If a schema rollback is needed, create a proper reverse migration.

## Current Test-Deploy Caveats

- No production file storage is configured yet.
- OAuth/magic-link auth is not implemented; credentials auth only.
- Telegram `/remind`, `/summarize`, file capture, and voice transcription are still pending.
- Full browser E2E tests are not implemented.
