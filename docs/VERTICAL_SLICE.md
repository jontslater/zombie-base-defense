# Vertical slice — definition

One shippable slice that proves the product loop, shell, persistence, multiplayer, and automation—not feature completeness.

TBH’s design pattern (see `docs/TBH_FEATURE_AUDIT.md`): **thin always-on view + deep management panels + long-horizon progression**. We keep that pattern: the strip stays **status + fantasy**, the panel carries **buildcraft**. Broader milestone slices (TBH parity passes) are outlined under [Milestone slices (TBH parity)](#milestone-slices-tbh-parity).

## Playable loop (target)

| Step | Intent | Code reality today |
| --- | --- | --- |
| **Waves / campaign** | Survive escalating encounters; **TBH-style grid** 4 tiers × 3 acts × 10 stages (boss on each act-10); farm cleared stages. Legacy `wave` is **encounter wave 1–120** for scaling. | Implemented: `campaign.ts`, `currentStageKey` / `campaignHighestClearedKey`, `SET_CAMPAIGN_STAGE`, strip + panel UI. Boss cadence uses stage-10 (`campaignStageIsBoss`). |
| **Scrap / currency / materials** | Earn **currency** + **scrap** from combat; **salvage** gear into **materials**; spend on upgrades, workbench, **alchemy forge**, and **synthesis**. | Implemented (`tick.ts`, `commands.ts`, `workbenchMaterials.ts`). |
| **Upgrade base & skills** | Wall/turret/generator/workbench + skill nodes + gear. | Implemented (`commands.ts`, `constants.ts`). |
| **Harder waves** | Scaling via encounter wave in `buildWaveCombat` (from `currentStageKey`). Synthesis / alchemy forged power uses the same encounter wave. | Implemented. |
| **Reborn** | Prestige reset with a lasting bonus meta-loop (TBH-style “Reborn”). | Implemented in `@zbd/sim`: `applyReborn`, `rebornCount`, tests in `reborn.test.ts`, balance knobs in `constants.ts`. |

**Slice acceptance**: a player can run **waves → earn → upgrade → notice difficulty increase** in the **400×80** strip + panel, then **Reborn** and still have a reason to continue (stacking income/DPS bonuses from `rebornCount`).

## Shell & presentation

- **One strip screen** that looks **intentional**: layout matches production strip (`StripScene`): survivors **left**, zombies **right**, base **far right**, legible HP bar and label—not dev placeholder chaos.

## Save / load continuity

- **Browser**: `localStorage` key `zbd_save_v1` (`apps/desktop/src/game/runtime.ts`).
- **Tauri**: `read_save` / `write_save` invocations with the same serialized envelope from `@zbd/sim`.
- **Slice acceptance**: quit and relaunch (or refresh)—**same wave, currency, upgrades, inventory** within normal migration rules (`SAVE_VERSION`), including **`rebornCount`** after Reborn.

## Co-op

- **Invite code** join: host **create_room** → guests **redeem** (`apps/relay`), up to **4** players, host-authoritative sim at **10 Hz**.
- **Slice acceptance**: two clients can join the same room and see **assigned survivor** + relay traffic; drop-in/drop-out behavior matches README (“AI grace” **60s** sim time then depart).

## Automation

- **Headless smoke**: `pnpm --filter @zbd/sim smoke` runs `packages/sim/scripts/smoke-reborn.ts` (default **N = 8** waves cleared, then **one Reborn**), **exit 0** on success. Root shortcut: `pnpm smoke:sim`.
- **CI**: `.github/workflows/pr-tests-and-smoke.yml` runs **`pnpm test`** and **`pnpm --filter @zbd/sim smoke`** on **every PR** (Linux). The Windows installer workflow remains `.github/workflows/build-windows.yml`.

## Ship checklist

- [ ] **Unsigned installer** from CI (`pnpm tauri build` in GHA) with artifacts attached.
- [ ] **Known bugs** list in PR/release notes (living doc OK).
- [ ] **AI art disclosure** text drafted for store pages.
- [ ] **itch / Steam** pages **later** (not blocking the slice).

## Definition of done

The vertical slice is **done** when:

1. A **human** can complete the loop above in the **desktop strip** build.
2. **Save/load** survives restart (including Reborn state).
3. **Invite-code co-op** works host + at least one guest on a deployed relay.
4. The **headless smoke** runs **N** waves + **Reborn** and passes in **CI on PRs** (see Automation above).
5. Ship checklist items relevant to internal testing (**installer**, **bugs**, **disclosure draft**) are **checked or explicitly waived** with reason.

---

## Milestone slices (TBH parity)

These layers sit **above** the core vertical slice: they move **gameplay depth** toward **Task Bar Hero (TBH)** parity **without** blowing up the **~400×80 strip** or the **deterministic sim** boundary.

### Locked north star (slice invariants)

Every slice must respect:

- Desktop **Tauri** strip ~**400×80**, taskbar-adjacent.
- **Unsigned** Windows bundles from CI; **no paid signing**.
- **Save/load** compatible with `@zbd/sim` versioning (including prestige fields).
- **Relay co-op** invite flow remains viable (host/guest command validation).
- **AI art** under `assets/ASSETS.md` with **disclosure**.
- **Tests** (`pnpm test`) remain green on PRs.

### Slice 0 — Shipped baseline (repo today)

**Goal:** Playable idle defense with strip + panel + relay + persistence + Reborn prestige in sim.

**Includes:**

- Phaser strip: survivors left, zombies right, core right (`stripScene.ts`).
- Panel: upgrades, gear UI, co-op controls (`main.ts`, `gearPanel.ts`).
- Sim: waves, bosses every 10 waves, loot, workbench, offline tick catch-up, **Reborn** (`tick.ts`, `waves.ts`, `offline.ts`, `commands.ts`).
- Relay: invite/redeem, host snapshots/deltas (`apps/relay` + `coopSession.ts`).

**Out of scope vs TBH depth:** no act map, no meta tree, no item sockets, no synthesis loop beyond workbench v1, minimal skills.

### Slice 1 — Round 1 alignment (do not re-scope here)

Work already in flight: **balance + Reborn tuning**, **art pipeline**, **save/load + CI smoke** hardening. This document **does not** redefine Round 1; coordinate with active owners (`docs/AGENT_BRIEFS.md` Lanes A–C).

**Exit criteria** (delegated to Round 1 plans): agreed tuning targets, art pipeline milestones, PR CI gates including smoke where adopted.

### Slice 2 — “Breadth before height” (TBH parity pass 1)

**Goal:** Introduce **parallel progression** and **crafting breadth** analogous to TBH’s **Rune tree + Cube** — still strip-safe.

**Candidate scope (pick subset per PR; see AGENT_BRIEFS):**

- **Perimeter grid** (rune analogue): unlock nodes that change economy/combat QoL (offline rules, scrap income, drop bands).
- **Salvage tiers**: materials that feed **workbench recipes** beyond enhance/reroll.
- **Synthesis lane**: convert many low-tier items into higher-tier rolls (9→1 style).

**Acceptance:**

- New systems are **data-driven** (tables in sim) and **unit tested**.
- Strip remains readable; heavy UI stays in panel.
- Co-op host still authoritative; guests cannot unlock host-only meta without rules.

### Slice 3 — “Fantasy depth” (TBH parity pass 2)

**Goal:** Match TBH’s **gear fantasy** and **content volume** at a sustainable scope.

**Candidate scope:**

- **More gear slots / categories** aligned to zombie kit (weapons, armor, gadgets).
- **Socket-like modifiers** (decoration/engraving analogues) with readable tooltips in panel.
- **Stage/region selection** or **biome acts** (maps TBH’s act/tier structure to regions).
- **Enemy roster variety** beyond numeric scaling (special infected keywords).

**Acceptance:**

- Clear player-facing **goal chains** (act/farming targets).
- Performance: sim tick cost bounded; no UI regressions in strip FPS.

### Slice 4 — Live ops–lite (optional, later)

TBH uses seasonal updates (events, relic systems, etc.). We only add **event lanes** if they do not violate north star.

---

## How to use this doc

- **Milestone planning:** pick one slice; cut PRs from `docs/AGENT_BRIEFS.md`.
- **Design reviews:** ask “does this respect strip + sim + co-op authority?”
