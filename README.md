# Zombie Base Defense — Milestone 2

Desktop-first idle base defense against zombie waves. The simulation is headless and deterministic; the desktop app renders a **400×80** strip (taskbar-adjacent) with an expandable command panel. Co-op uses a WebSocket relay with invite codes. The sim includes **Reborn** prestige (reset with stacking meta bonuses) and a **headless smoke** entrypoint — see `packages/sim` and `docs/DESIGN.md`.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) 10+
- Rust toolchain (for `pnpm tauri:dev` / native builds)

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

### Environment

| Variable | Where | Description |
| --- | --- | --- |
| `VITE_RELAY_URL` | `apps/desktop/.env` | WebSocket URL for co-op (default `ws://localhost:8787` in dev) |
| `PORT` | Relay host | Listen port (`8787` locally; Railway sets automatically) |

Tauri reads optional `strip_config.json` from app data (`relayUrl`, strip position, click-through). See `apps/relay/README.md` for relay deployment.

## Run native strip (Tauri 2)

```bash
cd apps/desktop
pnpm tauri:dev
```

The window is **400×80**, always-on-top, and docks above the Windows taskbar using the monitor work area (position remembered in `strip_config.json`). Optional click-through toggles in the panel.

## Tests

```bash
pnpm test
```

Includes `@zbd/sim` (waves, loot, co-op join/disconnect, workbench, **Reborn**), `@zbd/relay` (invites, `/health`, host + 2 guests integration).

Headless smoke (deterministic waves + one **Reborn**): `pnpm smoke:sim` (runs `pnpm --filter @zbd/sim smoke`).

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `packages/sim` | Deterministic tick sim, gear/skills/workbench commands, co-op helpers, deltas |
| `apps/desktop` | Vite + Phaser 3 + Tauri shell |
| `apps/relay` | Node WebSocket relay (`/health`, Railway-ready) |
| `assets/` | Kenney CC0 sprites, UI, audio + `ASSETS.md` |

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/DESIGN.md`](docs/DESIGN.md) | North star, TBH depth target, pillars |
| [`docs/VERTICAL_SLICE.md`](docs/VERTICAL_SLICE.md) | Milestone slices vs TBH parity |
| [`docs/AGENT_BRIEFS.md`](docs/AGENT_BRIEFS.md) | PR-sized briefs (Round 2+ proposed) |
| [`docs/TBH_FEATURE_AUDIT.md`](docs/TBH_FEATURE_AUDIT.md) | TBH system inventory + gap table vs this repo |
| [`docs/STORE.md`](docs/STORE.md) | Draft store copy + **AI art disclosure** for listings |
| [`CREDITS.md`](CREDITS.md) | AI vs third-party art attribution |

## Relay on Railway

See [`apps/relay/README.md`](apps/relay/README.md). Build with `apps/relay/Dockerfile`; configure the Railway service health check on `/health` in the dashboard.

## Windows installer

Unsigned NSIS/MSI bundles are produced by GitHub Actions (`.github/workflows/build-windows.yml`) on pull requests and version tags. Local build:

```bash
cd apps/desktop && pnpm tauri build
```

## Co-op model (M2)

1. Host **Host (get code)** → relay returns a 6-character code.
2. Guests **Join**; host schedules spawn on the next **5s** sim boundary.
3. Each guest controls their assigned survivor (gear, skills, stance, targeting) via relay commands; host validates and applies.
4. Host broadcasts **deltas** each tick and snapshots after commands.
5. On disconnect, the survivor runs on AI for **60s**, then leaves; equipped loot returns to shared inventory.

## Layout

Survivors render on the **left** (facing right). Zombies render on the **right** (facing left). Base core on the far right.

## License

Game code: MIT (default). Sprite and icon art in this branch includes **AI-assisted** assets (see `docs/STORE.md` and `assets/ASSETS.md`); remaining Kenney CC0 placeholders are listed in `assets/ASSETS.md`.
