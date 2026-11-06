# Vertical slice — definition

One shippable slice that proves the product loop, shell, persistence, multiplayer, and automation—not feature completeness. Broader **Task Bar Hero** parity slices are layered in **after** this baseline (see **TBH parity passes** below).

## Playable loop (target)

| Step | Intent | Code reality today |
| --- | --- | --- |
| **Waves** | Survive escalating waves; bosses every **10** waves (`BOSS_EVERY_N_WAVES`). | Implemented in `@zbd/sim` (`waves.ts`, `tick.ts`). |
| **Scrap / currency** | Earn **currency** + **scrap** from combat; spend on upgrades and workbench. | Implemented (`tick.ts`, `commands.ts`). |
| **Upgrade base & skills** | Wall/turret/generator/workbench + skill nodes + gear. | Implemented (`commands.ts`, `constants.ts`). |
| **Harder waves** | Scaling via wave number in `buildWaveCombat`. | Implemented. |
| **Reborn** | Prestige reset with stacking **income/DPS** bonuses (`rebornCount`). | Implemented: `REBORN` command, `applyReborn`, tests (`reborn.test.ts`), headless `pnpm smoke:sim`. |

**Slice acceptance:** a player can run **waves → earn → upgrade → notice difficulty increase** in the **400×80** strip + panel, then **Reborn** and retain a reason to continue (stacking meta — see `constants.ts`).

## Shell & presentation

- **One strip screen** that looks **intentional**: layout matches production strip (`StripScene`): survivors **left**, zombies **right**, base **far right**, legible HP bar and label—not dev placeholder chaos.

## Save / load continuity

- **Browser**: `localStorage` key `zbd_save_v1` (`apps/desktop/src/game/runtime.ts`).
- **Tauri**: `read_save` / `write_save` invocations with the same serialized envelope from `@zbd/sim`.
- **Slice acceptance**: quit and relaunch (or refresh)—**same wave, currency, upgrades, inventory, rebornCount** within normal migration rules (`SAVE_VERSION`).

## Co-op

- **Invite code** join: host **create_room** → guests **redeem** (`apps/relay`), up to **4** players, host-authoritative sim at **10 Hz** (sim tick rate).
- **Slice acceptance**: two clients can join the same room and see **assigned survivor** + relay traffic; drop-in/drop-out behavior matches README (“AI grace” **60s** sim time then depart).

## Automation

- **Unit tests:** `pnpm test` runs Vitest across packages (including `@zbd/sim` Reborn tests).
- **Headless smoke:** `pnpm smoke:sim` runs `packages/sim/scripts/smoke-reborn.ts` — advances until **N** waves cleared, performs **one Reborn**, exits **0** on success.
- **CI today:** `.github/workflows/build-windows.yml` runs on `pull_request` (installer build). **Optional follow-up:** add a Linux (or `ubuntu-latest`) workflow job so **smoke + test** runs on **every PR** (per original Round 1 lane intent).

## Ship checklist

- [ ] **Unsigned installer** from CI (`pnpm tauri build` in GHA) with artifacts attached.
- [ ] **Known bugs** list in PR/release notes (living doc OK).
- [ ] **AI art disclosure** text drafted for store pages.
- [ ] **itch / Steam** pages **later** (not blocking the slice).

## Definition of done

The vertical slice is **done** when:

1. A **human** can complete the loop above in the **desktop strip** build.
2. **Save/load** survives restart.
3. **Invite-code co-op** works host + at least one guest on a deployed relay.
4. **Headless smoke** (`pnpm smoke:sim`) runs **N** waves + **Reborn** locally with exit code **0**; CI expansion tracked above.
5. Ship checklist items relevant to internal testing (**installer**, **bugs**, **disclosure draft**) are **checked or explicitly waived** with reason.

---

## Locked north star (TBH parity slices)

Slices below must still respect: Tauri **~400×80** strip, **unsigned** Windows CI, **save/load**, **relay co-op**, **AI art + disclosure**, **no paid signing**.

## Slice 0 — Shipped baseline

**Goal:** Playable idle defense with strip + panel + relay + persistence + Reborn.

**Includes:** Phaser strip, panel upgrades/gear/co-op, sim waves/loot/workbench/offline catch-up, relay, `REBORN` prestige.

**Out of scope vs TBH depth:** no act map, no meta tree, no item sockets, no synthesis loop, minimal skills.

## Slice 1 — Round 1 follow-through

Coordinate with owners for: art pipeline manifest, save migration edge cases, and **optional** PR workflow for `pnpm test` + `pnpm smoke:sim`. This doc does not redefine those initiatives.

## Slice 2 — “Breadth before height” (TBH parity pass 1)

**Goal:** Parallel progression and crafting breadth analogous to TBH’s **Rune tree + Cube** — strip-safe.

**Candidate scope:** perimeter grid (rune analogue), material tiers, synthesis (9→1 style). See `docs/AGENT_BRIEFS.md` (R2-1 — R2-3).

## Slice 3 — “Fantasy depth” (TBH parity pass 2)

**Goal:** Gear fantasy and content volume at sustainable scope — more slots/rarities/modifiers, regions/acts, enemy tags. See `docs/AGENT_BRIEFS.md` (R2-4 — R2-7).

## Slice 4 — Live ops–lite (optional)

Seasonal/event lanes only if they do not violate the north star.

---

## How to use this doc

- **Milestone planning:** pick one slice; cut PRs from `docs/AGENT_BRIEFS.md`.
- **Design reviews:** ask “does this respect strip + sim + co-op authority?”
