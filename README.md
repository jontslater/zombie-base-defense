# Zombie Base Defense — Milestone 1

Desktop-first idle base defense against zombie waves. The simulation is headless and deterministic; the desktop app renders a **400×80** strip (taskbar-adjacent) with an expandable command panel. Co-op uses a small WebSocket relay with invite codes.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- Rust toolchain (only for `pnpm tauri:dev` / native builds)

## Install

```bash
pnpm install
```

## Run in the browser (recommended for dev)

Terminal 1 — game (Vite on port 5173):

```bash
pnpm dev
```

Terminal 2 — co-op relay (optional, port 8787):

```bash
pnpm dev:relay
```

Open http://localhost:5173. Click the strip to expand the panel. Saves use `localStorage` key `zbd_save_v1` in the browser.

Environment:

- `VITE_RELAY_URL` — WebSocket URL (default `ws://localhost:8787` in dev)

## Run native strip (Tauri 2)

```bash
cd apps/desktop
pnpm tauri:dev
```

The window is configured **400×80**, always-on-top. Versioned JSON saves are written to the app data directory via Tauri `read_save` / `write_save` commands when running under Tauri.

## Tests

```bash
pnpm test
```

Covers `@zbd/sim` (waves, loot RNG, save round-trip, offline cap) and `@zbd/relay` (invite create/redeem/expire/rate limit).

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `packages/sim` | Deterministic tick sim, serializable commands, save/offline |
| `apps/desktop` | Vite + Phaser 3 + Tauri shell |
| `apps/relay` | Node WebSocket relay for host-authoritative co-op |
| `assets/` | Placeholder CC0 sprites + `ASSETS.md` |

## Relay on Railway

Build from repo root using `apps/relay/Dockerfile`:

```bash
docker build -f apps/relay/Dockerfile -t zbd-relay .
docker run -p 8787:8787 zbd-relay
```

Set `PORT` as required by Railway.

## Co-op model (M1)

1. Host clicks **Host (get code)** → relay returns a 6-character code (15-minute TTL, max 4 players).
2. Guests **Join** with the code (rate-limited to 5 failed redeems/min/IP).
3. Guest upgrade commands are forwarded to the host; the host runs `@zbd/sim` and broadcasts snapshots.

## Known gaps (Milestone 1)

- Art is 16×16 placeholders; Kenney packs are documented but not imported yet.
- Co-op: guests do not simulate combat locally; only the host advances ticks. Delta sync is minimal.
- Gear equip / skill UI is not in the panel yet (sim + commands exist).
- Linux/macOS/Windows taskbar positioning and click-through are not customized per platform.
- Tauri production bundling and code signing are not configured.

## License

Game code: MIT (default). Art placeholders: CC0 (see `assets/ASSETS.md`).
