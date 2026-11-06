# Zombie Base Defense — Design (M2+)

## Pitch

A **desktop-first** idle base defense: survivors on the **left** (facing **right**) hold the line while a zombie horde closes in from the **right**. A **base core** sits on the **far right**. You **build and upgrade** the base (walls, turrets, generator, workbench), **equip and enhance** gear, and **spend skill nodes** on survivors. Progression echoes **Task Bar Hero (TBH)**—short sessions, compounding upgrades, and room to grow offline—plus **Reborn** prestige in `@zbd/sim` (`applyReborn`, `rebornCount`, balance knobs in `constants.ts`)—stacking meta bonuses after reset.

## North star (locked)

These constraints are **non-negotiable** for the product direction:

1. **Desktop-first (Tauri)** — a **~400×80** horizontal strip docked **above the Windows taskbar**, always-on-top, lightweight enough to run beside real work.
2. **Unsigned CI installer** — Windows **NSIS/MSI** artifacts from GitHub Actions **without** paid code signing (see `.github/workflows/build-windows.yml`).
3. **Save / load** — durable progress with migration hooks in `@zbd/sim` (`save.ts`) and persistence in the desktop shell (`runtime.ts` / Tauri `read_save`/`write_save`).
4. **Relay co-op** — **invite-code** rooms over WebSocket (`apps/relay`); host authoritative sim; guests control assigned survivors (see `README.md` co-op model).
5. **AI art pass** — generated or assisted art follows **ART_RULES** below and `assets/ASSETS.md`, with **visible disclosure** on store listings (per platform policy).
6. **Headless smoke** — `@zbd/sim` exposes `pnpm --filter @zbd/sim smoke` (`packages/sim/scripts/smoke-reborn.ts`); **every PR should stay mergeable** with `pnpm test` green; wiring smoke into **GitHub Actions on every PR** is tracked in Round 1 (Lane C / vertical slice).
7. **No paid signing** in the default release path (see item 2).

## Depth target: “Taskbar Hero–class” loop

**TBH: Task Bar Hero** (Nugem / Steam) is the **gameplay-depth reference**, not a pixel-for-pixel clone. We aim for **comparable systemic richness**: long-horizon gear/crafting/meta progression, many optional knobs, and an idle-friendly core that still rewards planning between waves.

External summary of TBH’s pillars (for alignment; citations in `docs/TBH_FEATURE_AUDIT.md`):

- **Campaign breadth** — multi-act structure, multiple difficulties, many stage entries.
- **Gear fantasy** — many equipment types, **long rarity tail**, sockets/mod layers.
- **Central crafting** (TBH’s Cube) — multiple operations feeding the economy.
- **Parallel meta tree** (TBH’s Runes) — offline unlocks, automation, QoL, combat modifiers.
- **Large skill catalog** — build-defining choices beyond raw DPS.
- **Side systems** — pets, skins/appearance, achievements, materials, trading (we will **not** mirror Steam Market unless scope changes).

Our **zombie base-defense** skin maps these pillars to **survivors vs waves**, **base upgrades**, **salvage/workbench**, **Reborn**, and **relay co-op** (TBH is officially **single-player** — co-op is our deliberate differentiator).

## Core loop

1. **Combat waves** — Headless sim (`packages/sim`) advances at **10 ticks per second** (`TICKS_PER_SECOND`). When idle between fights, waves auto-start on a timer (every **3s** of sim time in current code).
2. **Rewards** — Kills grant **currency** and **scrap**; loot rolls into **inventory** (rarities and workbench actions live in sim). Income scales with **Reborn** stacks via `REBORN_INCOME_MULT_PER_STACK` in `constants.ts`.
3. **Spend** — Currency upgrades base tracks; scrap/currency feed **workbench** enhance/reroll; skill points unlock **skill nodes**.
4. **Reborn** — At minimum wave (`REBORN_MIN_WAVE`, idle / not in combat), **Reborn** resets the run, increments `rebornCount`, and reapplies starting currency from `rebornStartingCurrency` plus persistent DPS scaling (`REBORN_DPS_MULT_PER_STACK`). See `commands.ts` / `reborn.test.ts`.
5. **Co-op** — Up to **4** players (`MAX_PLAYERS` in `apps/relay`): host gets an invite **code**, guests **redeem** and join; host-authoritative sim with relay message types `host_snapshot` / `host_delta` / `guest_command` (`apps/relay`). Guests spawn on the next **5s** sim boundary (`COOP_JOIN_INTERVAL_TICKS`).

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

## Product pillars (ZBD)

1. **Readable strip** — at a glance: wave pressure, core health, currency, combat tempo.
2. **Deterministic simulation** — `@zbd/sim` remains the source of truth; UI is a renderer.
3. **Expandable panel** — gear, upgrades, co-op, and future “Cube-like” systems live here, not in the strip.
4. **Fair offline** — bounded catch-up consistent with design (today: tick advance with cap — see `offline.ts`; evolving toward TBH-style **reward tables** is backlog).
5. **Modest scope explosion** — depth should come from **data + systems**, not from abandoning the strip constraint.

## Current simulation snapshot (Milestone 2+)

Authoritative detail lives in code; this is a **summary**:

- **Economy:** `currency` (build purchases) and `scrap` (workbench); Reborn stacks tune kill/generator income.
- **Defenses:** `wall`, `turret`, `generator`, `workbench` base upgrades.
- **Survivors:** gear slots, stances, target modes, small **skill** lattice, optional relay control.
- **Combat:** wave scaling, periodic **boss** waves, core + survivor damage split; DPS scales with Reborn via `rebornDpsMultiplier`.
- **Loot:** rarity-weighted drops with a **power** stat; workbench **enhance** and **reroll**.
- **Prestige:** **Reborn** command resets run state while keeping `rebornCount` and applying payout from `rebornStartingCurrency`.

## Roadmap coordination

- **Round 1** (in flight elsewhere): balance + Reborn tuning, art pipeline, save/load hardening, **CI smoke on every PR**. **Do not duplicate or rewrite Round 1 plans here**—see `docs/AGENT_BRIEFS.md` Lanes A–C and `docs/VERTICAL_SLICE.md` Slice 1.
- **Round 2+** — see `docs/AGENT_BRIEFS.md` for PR-sized lanes toward TBH-style depth.

## Builds and signing

**Code signing stays off** for the first Windows drops: CI produces **unsigned** NSIS/MSI artifacts (`.github/workflows/build-windows.yml`) suitable for testing on a designated PC.

## Related documents

- `docs/TBH_FEATURE_AUDIT.md` — system-by-system TBH inventory + gap table.
- `docs/VERTICAL_SLICE.md` — slice definition, milestones, and TBH parity passes.
- `docs/AGENT_BRIEFS.md` — agent-executable briefs.
- `README.md` — build/run/co-op/developer setup.
