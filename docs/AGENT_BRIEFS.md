# Agent briefs — template and lanes

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

## Round 1 — Active lanes (do not duplicate)

These tracks are **already in motion**: **balance + Reborn**, **art pipeline**, **save/load + CI smoke**. Agents should **not** reopen or rewrite them wholesale; coordinate on overlapping files.

### Lane A — Balance + Reborn prestige (`packages/sim`)

**Goal:** Tune **Reborn** prestige in the deterministic sim—persistent meta benefit after reset—alongside wave/currency/scrap progression; **Vitest** coverage for edge cases; **headless smoke** that runs scripted waves and **one Reborn** non-interactively.

**Status (repo today):** Reborn command, `rebornCount`, `reborn.test.ts`, and `pnpm --filter @zbd/sim smoke` (`packages/sim/scripts/smoke-reborn.ts`) exist. Remaining work: balance iteration, any save/migrate hardening, and UX surfacing if needed.

**Out of scope:** Phaser UI, Tauri shell, relay protocol changes, Steam/itch copy (unless explicitly briefed).

**Files allowed:** `packages/sim/**`, root `package.json` / `pnpm-workspace.yaml` only if adjusting workspace scripts; `scripts/**` under `packages/sim` for smoke.

**Acceptance checks:**

- [ ] `pnpm --filter @zbd/sim test` passes; tests cover Reborn transitions and persistence fields in save/load.
- [ ] **Headless smoke** via `pnpm --filter @zbd/sim smoke` (or `pnpm smoke:sim` from root) completes with exit code **0**.
- [ ] Balance knobs (wave scaling, Reborn bonus) stay **data-driven** or centralized in `constants.ts` with a short comment block.

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

**Goal:** Ensure **serialize/parse/migrate** paths stay stable across versions; wire **`pnpm --filter @zbd/sim smoke`** into **GitHub Actions** so it runs on **every PR** (Linux job is fine); keep Windows installer workflow as-is unless shared setup needs extraction.

**Status (repo today):** Smoke script ships with `@zbd/sim`; root `pnpm smoke:sim` delegates to it. **CI workflow** for PR smoke is **not** merged yet—see `docs/VERTICAL_SLICE.md` Automation.

**Out of scope:** Reborn design (consume Lane A’s behavior), new art assets.

**Files allowed:** `.github/workflows/**`, `packages/sim/**` (save/migrate only if fixing bugs), `apps/desktop/src/game/runtime.ts` if save compatibility fixes are required, root `package.json`.

**Acceptance checks:**

- [ ] New workflow runs smoke on `pull_request` and fails the PR on failure (or documented waiver).
- [ ] `pnpm test` (or documented subset) still runs in CI where practical.
- [ ] `docs/VERTICAL_SLICE.md` updated if the exact `pnpm` command or CI layout changes.

**Rules:** Never “fix” CI by skipping smoke; fix flakiness or determinism in the sim.

---

## Round 2+ lanes (proposed, by impact)

Briefs below are **PR-sized** execution units toward **Task Bar Hero–class depth** while keeping **`docs/DESIGN.md` north star**. Each should include: **problem**, **scope**, **acceptance criteria**, **files likely touched**, **risk**.

### R2-1 — Perimeter grid (TBH “Rune tree” analogue)

- **Problem:** No long-horizon meta layer; progression is almost entirely per-wave gear RNG.
- **Scope:** Add a **directed acyclic** unlock grid (JSON/table in `packages/sim`) keyed off `currency`/`scrap`/milestones; effects as pure multipliers and unlock flags (e.g. second bench recipe, +drop band). Panel section for purchases; strip shows **summary node count** only.
- **Acceptance:** Host migration in `save.ts`; deterministic tests for a few paths; co-op guests obey “cannot buy grid” unless design allows shared pool (default: **host only**).
- **Files:** `packages/sim/src/constants.ts`, new `perimeter.ts`, `commands.ts`, `types.ts`, `save.ts` migrate; `apps/desktop` panel.
- **Zombie flavor:** Radio relays, fence lights, trap frequency caps.

### R2-2 — Material pipeline + “breakdown” (TBH Alchemy subset)

- **Problem:** Only two consumables (`currency`, `scrap`) — cannot support crafting breadth.
- **Scope:** Introduce **3–6 material IDs**; defeated waves and dismantle command convert loot → materials; workbench recipes consume materials for **targeted rolls** (choose slot, band).
- **Acceptance:** Commands covered by tests; economy bounded (no exponential exploit in deterministic sim).
- **Files:** `types.ts`, `commands.ts`, `waves.ts`, panel inventory displays.
- **Risk:** Inventory UI complexity — keep v1 minimal.

### R2-3 — Synthesis crucible (9→1 style)

- **Problem:** No **sink** for duplicated low-tier gear (core TBH loop).
- **Scope:** Panel flow: select 9 items of same rarity → consume → roll next tier with level/range parameters mirroring TBH’s dropdown concept (we can use **current wave band** as v1).
- **Acceptance:** RNG uses `@zbd/sim` `rng.ts`; tests for edge cases (inventory full, invalid selection).
- **Files:** `commands.ts`, new helper, tests.

### R2-4 — Socket-style modifiers (decoration/engraving analogues)

- **Problem:** Gear is a single `power` number; missing TBH’s build-defining layers.
- **Scope:** Add **1–2 modifier slots** per item at high rarities; modifiers are small **typed bonuses** (%vs elites, scrap on kill, regen ticks). Workbench operations apply or reroll mods (scrap+currency).
- **Acceptance:** Modifier changes flow through save/load; strip stays clean; tooltips in panel.
- **Files:** `types.ts` (`GearItem` schema bump with migration), `waves.ts`, `commands.ts`, desktop gear panel.

### R2-5 — Class or role kits (TBH hero variety)

- **Problem:** Survivors are interchangeable stat blobs; TBH sells **6 distinct kits**.
- **Scope:** Add `role` enum with **passive perk** + **weapon proficiency** band; starting survivors pick distinct roles; co-op spawns align with roles.
- **Acceptance:** Balance test harness scenarios; docs updated briefly in DESIGN linkage.
- **Files:** `save.ts` migration, `createInitialState`, `waves.ts` (small perk hooks).

### R2-6 — Act / region map + highest-cleared ladder (TBH staging)

- **Problem:** Infinite wave list doesn’t create farming targets like TBH acts.
- **Scope:** Data-driven **regions** with recommended wave ranges; track `highestClearedRegion`; offline and loot bonuses key off that in a later brief (stub field now).
- **Acceptance:** Region select UI in panel; sim still supports legacy wave counter.
- **Files:** new table module, `types.ts`, panel.

### R2-7 — Enemy roster tags (TBH monster variety)

- **Problem:** Zombies differ only by numbers; TBH has many monster archetypes.
- **Scope:** Enum tags (`shambler`, `runner`, `boss`) affecting inbound damage split or turret priority; wave builder samples tags by wave/region.
- **Acceptance:** Deterministic tests for tag spawns; strip can show icon for boss only first.
- **Files:** `waves.ts`, `tick.ts`, assets later.

### R2-8 — Offline reward table (TBH offline analogue)

- **Problem:** Current offline is **raw sim ticks** — cheap but not TBH-shaped.
- **Scope:** Replace or augment with **per-minute reward table** based on `highestClearedRegion` / wave; cap still 8h; tunable constants.
- **Acceptance:** Tests for cap; migration keeps old saves fair.
- **Files:** `offline.ts`, `types.ts`.

### R2-9 — Achievements / Comms log milestones

- **Problem:** TBH has dozens of achievements driving retention.
- **Scope:** Local **comms log** tracking kills, crafts, region clears; optional future cloud — **out of scope** unless approved.
- **Acceptance:** Purely client-visible list in panel; no Steam dependency.

### R2-10 — Pet/companion slot (TBH pets, simplified)

- **Problem:** No charm-layer progression.
- **Scope:** Single **companion** slot with passive (always on); unlock by milestone (e.g. kill tags).
- **Acceptance:** Save migration; one companion v1.

---

## How agents should pick work

1. Read `docs/DESIGN.md` + `docs/TBH_FEATURE_AUDIT.md`.
2. For Round 1, use **Lanes A–C** above; for new breadth, pick **one** Round 2 brief.
3. After code land, update `docs/VERTICAL_SLICE.md` checkboxes if your team tracks them in-repo.
