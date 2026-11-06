# Zombie Base Defense — Design (M2+)

## Pitch

A **desktop-first** idle base defense: survivors on the **left** (facing **right**) hold the line while a zombie horde closes in from the **right**. A **base core** sits on the **far right**. You **build and upgrade** the base (walls, turrets, generator, workbench), **equip and enhance** gear, and **spend skill nodes** on survivors. Progression echoes **Task Bar Hero (TBH)**—short sessions, compounding upgrades, and room to grow offline—plus a planned **Reborn** prestige layer (see repo: not implemented in sim yet; target for the vertical slice).

## Core loop

1. **Combat waves** — Headless sim (`packages/sim`) advances at **10 ticks per second** (`TICKS_PER_SECOND`). When idle between fights, waves auto-start on a timer (every **3s** of sim time in current code).
2. **Rewards** — Kills grant **currency** and **scrap**; loot rolls into **inventory** (rarities and workbench actions live in sim).
3. **Spend** — Currency upgrades base tracks; scrap/currency feed **workbench** enhance/reroll; skill points unlock **skill nodes**.
4. **Co-op** — Up to **4** players (`MAX_PLAYERS` in `apps/relay`): host gets an invite **code**, guests **redeem** and join; host-authoritative sim with relay message types `host_snapshot` / `host_delta` / `guest_command` (`apps/relay`). Guests spawn on the next **5s** sim boundary (`COOP_JOIN_INTERVAL_TICKS`).

## Player shell

- **Primary**: **Tauri** window **400×80**, always-on-top strip docked **above the taskbar**, **click** to expand a **panel** (Vite + Phaser in `apps/desktop`). Optional `strip_config.json` for relay URL and positioning.
- **Secondary / later**: stream-friendly view and public website—out of scope for the first ship.

## Networking

- **Sim**: deterministic, packaged as `@zbd/sim`.
- **Relay**: Node **WebSocket** server in `apps/relay`, **Railway**-ready (`Dockerfile`, `/health`). Deployed URL is wired via `VITE_RELAY_URL` / Tauri config.

## Art direction

### ART_RULES (coherent style for sprites / UI / promo)

| Area | Rule |
| --- | --- |
| **Palette** | Dark UI ground (`#0b0f14`-class backs), cool neutrals for chrome (`#2a3544`, `#e8eef5` text), **accent** `#3d8bfd` for bars/highlights; loot tiers may follow sim `RARITY_COLORS` in `packages/sim/src/constants.ts` for consistency with rarities. |
| **Pixel size / resolution** | Target **32×32** (or **64×64**) **source** sprites at **1×** in the strip; scale in-engine as needed. UI icons **16–32px** tall in the strip; panel can use larger art but same palette and outline rules. |
| **Silhouette** | **Readable at 1×** in the strip: big head/shoulders or props; avoid fine hair strands or 1px detail that disappears at strip scale. |
| **Facing** | **Survivors**: face **right** (flipX false in strip). **Zombies**: face **left** toward the base (flipX true). **Base**: neutral or slight three-quarter toward center. |
| **Outline** | **1px dark outline** on characters and large UI icons unless the style is explicitly outline-free **everywhere** (pick one: default is **outlined** for strip clarity). |

**Placeholders**: **Kenney CC0** assets under `assets/` remain until replaced; see `assets/ASSETS.md`.

**AI-generated art**: **Allowed** for sprites, UI, and promotional art **if** it follows this style guide. **Store listing** must **disclose** AI-assisted artwork (per platform policy and team ethics).

## Builds and signing

**Code signing stays off** for the first Windows drops: CI produces **unsigned** NSIS/MSI artifacts (`.github/workflows/build-windows.yml`) suitable for testing on a designated PC.
