# Agent briefs — template, Round 1 lanes, and Round 2+ proposals

Use one brief per task. Agents stay in lane, preserve quality bars, and prefer fixing **data/pipelines** over one-off hacks.

## Brief template

Copy for each task:

```markdown
## Goal
(One sentence: shipped behavior or artifact.)

## Out of scope
(Bullet list — what not to touch.)

## Files / packages allowed
(e.g. `packages/sim/**`, `scripts/**` — be explicit.)

## Acceptance checks
- [ ] …
- [ ] …

## Rules
- Never weaken or delete tests to green CI; fix behavior or update tests with reviewer-visible rationale.
- Stay in lane: no unrelated refactors or drive-by formatting.
- When requirements are ambiguous, **make a documented call** in the PR (one paragraph).
- Prefer fixing **generators, manifests, and pipelines** over hand-editing derived assets.
```

---

## Round 1 — Lanes A–C (status: Reborn + smoke shipped in sim)

### Lane A — Balance + Reborn prestige (`packages/sim`) — **shipped**

**Summary:** **Reborn** is implemented: `REBORN` command, `rebornCount`, income/DPS stacking, tests (`reborn.test.ts`), headless `pnpm smoke:sim` (`scripts/smoke-reborn.ts`).

**Ongoing work (if any):** tuning constants in `constants.ts`, edge cases, or desktop UI exposure — small PRs; do not remove Vitest coverage.

**Rules:** Do not reduce existing sim test assertions without replacing them with stronger checks.

---

### Lane B — Art pipeline (style + manifest import)

**Goal:** Encode **docs/DESIGN.md** ART_RULES in a machine-readable **style guide** snippet (could live under `docs/` or `assets/`), and implement a **sprite import / atlas pipeline** driven by **one manifest** so **Kenney** or **AI** sources drop in via the same path (build or `pnpm` step).

**Out of scope:** Gameplay balance, relay, CI smoke logic (except if wiring an asset build step).

**Files allowed:** `assets/**`, `docs/**`, `apps/desktop/**` (Phaser load paths only), build config (`package.json`, `vite.config.ts`, small helper under `tools/` or `scripts/`).

**Acceptance checks:**
- [ ] Manifest lists sprites with frame names/paths; adding a new PNG requires **manifest + file** only.
- [ ] Strip still loads survivors/zombie/base from the pipeline output paths.
- [ ] Short README under `assets/` explains Kenney vs AI intake and **store disclosure** reminder.

**Rules:** No binary blobs in git beyond what the repo already uses; prefer documenting external AI exports.

---

### Lane C — Save/load hardening + CI smoke gate

**Goal:** Ensure **serialize/parse/migrate** paths stay stable across versions; wire **headless smoke** (`pnpm smoke:sim`) and **tests** into **GitHub Actions** on **every PR** (Linux job is fine); keep Windows installer workflow as-is unless shared setup needs extraction.

**Out of scope:** Reborn mechanics redesign (consume Lane A’s behavior).

**Files allowed:** `.github/workflows/**`, `packages/sim/**` (save/migrate fixes), `apps/desktop/src/game/runtime.ts` if save compatibility fixes are required, root `package.json`.

**Acceptance checks:**
- [ ] New workflow runs `pnpm test` and `pnpm smoke:sim` (or equivalent) on `pull_request` and fails the PR on failure.
- [ ] Doc note in `docs/VERTICAL_SLICE.md` matches the exact CI commands.

**Rules:** Never “fix” CI by skipping smoke; fix flakiness or determinism in the sim.

---

## Round 2+ lanes (proposed, by impact)

Briefs are **PR-sized** units toward **Task Bar Hero–class depth** while keeping **`docs/DESIGN.md` north star**. Ordered by impact.

### R2-1 — Perimeter grid (TBH “Rune tree” analogue)

- **Problem:** No long-horizon meta layer beyond Reborn stacks; progression is still heavy on per-wave gear RNG.
- **Scope:** Add a **directed acyclic** unlock grid (JSON/table in `packages/sim`) keyed off `currency`/`scrap`/milestones; effects as pure multipliers and unlock flags (e.g. second bench recipe, +drop band). Panel section for purchases; strip shows **summary node count** only.
- **Acceptance:** Host migration in `save.ts`; deterministic tests for a few paths; co-op guests obey host-only rules unless shared pool is explicitly designed.
- **Files:** `packages/sim/src/constants.ts`, new `perimeter.ts`, `commands.ts`, `types.ts`, `save.ts`; `apps/desktop` panel.
- **Zombie flavor:** Radio relays, fence lights, trap frequency caps.

### R2-2 — Material pipeline + “breakdown” (TBH Alchemy subset)

- **Problem:** Only two consumables (`currency`, `scrap`) — cannot support crafting breadth.
- **Scope:** Introduce **3–6 material IDs**; dismantle command converts loot → materials; workbench recipes consume materials for **targeted rolls** (choose slot, band).
- **Acceptance:** Commands covered by tests; economy bounded (no exponential exploit in deterministic sim).
- **Files:** `types.ts`, `commands.ts`, `waves.ts`, panel inventory displays.

### R2-3 — Synthesis crucible (9→1 style)

- **Problem:** No **sink** for duplicated low-tier gear (core TBH loop).
- **Scope:** Panel flow: select 9 items of same rarity → consume → roll next tier with level/range parameters (v1: **current wave band**).
- **Acceptance:** RNG uses `@zbd/sim` `rng.ts`; tests for edge cases (inventory full, invalid selection).
- **Files:** `commands.ts`, new helper, tests.

### R2-4 — Socket-style modifiers (decoration/engraving analogues)

- **Problem:** Gear is a single `power` number; missing TBH’s build-defining layers.
- **Scope:** Add **1–2 modifier slots** per item at high rarities; small **typed bonuses**; workbench apply or reroll (scrap+currency).
- **Acceptance:** Modifier changes flow through save/load; tooltips in panel.
- **Files:** `types.ts` (`GearItem` schema bump with migration), `waves.ts`, `commands.ts`, desktop gear panel.

### R2-5 — Class or role kits (TBH hero variety)

- **Problem:** Survivors are interchangeable stat blobs; TBH sells **6 distinct kits**.
- **Scope:** Add `role` enum with **passive perk** + band; starting survivors pick distinct roles; co-op spawns align with roles.
- **Acceptance:** Balance test harness scenarios; brief DESIGN linkage.
- **Files:** `save.ts` migration, `createInitialState`, `waves.ts`.

### R2-6 — Act / region map + highest-cleared ladder (TBH staging)

- **Problem:** Infinite wave list doesn’t create farming targets like TBH acts.
- **Scope:** Data-driven **regions** with wave ranges; track `highestClearedRegion`; later offline/loot hooks.
- **Acceptance:** Region select UI in panel; sim keeps legacy wave counter.

### R2-7 — Enemy roster tags (TBH monster variety)

- **Problem:** Zombies differ only by numbers.
- **Scope:** Enum tags (`shambler`, `runner`, `boss`) affecting damage split or turret priority.
- **Acceptance:** Deterministic tests for tag spawns.

### R2-8 — Offline reward table (TBH offline analogue)

- **Problem:** Offline is **raw sim ticks** — not TBH-shaped.
- **Scope:** Per-minute reward table from highest cleared sector/wave; cap still 8h.
- **Acceptance:** Tests for cap; fair migration.

### R2-9 — Achievements / Comms log milestones

- **Scope:** Local **comms log** for kills, crafts, region clears; no Steam dependency in v1.

### R2-10 — Pet/companion slot (TBH pets, simplified)

- **Scope:** One **companion** slot, passive always on; unlock by milestone.

---

## How agents should pick work

1. Read `docs/DESIGN.md` + `docs/TBH_FEATURE_AUDIT.md`.
2. For new depth: choose **one** Round 2+ brief.
3. After code land, update `docs/VERTICAL_SLICE.md` if acceptance criteria change.
