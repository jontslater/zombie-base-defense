# Relay service (`@zbd/relay`)

WebSocket co-op relay for Zombie Base Defense. Deploy on [Railway](https://railway.app) or any container host.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | Yes (Railway) | `8787` | HTTP + WebSocket listen port |
| `NODE_ENV` | No | `production` | Set by Docker image in production |

Railway injects `PORT` automatically. The process binds to `0.0.0.0:$PORT`.

## Health check

`GET /health` returns `200` with JSON:

```json
{ "ok": true, "service": "zbd-relay" }
```

Configure Railway health checks to use `/health` (see `railway.json`).

## Desktop / browser client

Point the game at your relay WebSocket URL:

- Browser dev: `apps/desktop/.env` → `VITE_RELAY_URL=ws://localhost:8787`
- Production build: `VITE_RELAY_URL=wss://your-relay.up.railway.app`
- Tauri: optional `relayUrl` in `strip_config.json` (see desktop README) overrides the build-time env when set.

Use `wss://` when the relay is served over HTTPS (Railway default).

## Local run

```bash
pnpm dev:relay
# or
pnpm --filter @zbd/relay start
```

## Docker

From repo root:

```bash
docker build -f apps/relay/Dockerfile -t zbd-relay .
docker run -e PORT=8787 -p 8787:8787 zbd-relay
```
