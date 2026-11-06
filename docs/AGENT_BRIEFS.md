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

## Lane A — Balance + Reborn prestige (`packages/sim`)

**Goal:** Implement **Reborn** prestige in the deterministic sim—persistent meta benefit after reset—tuned alongside existing wave/currency/scrap progression; **Vitest** coverage for edge cases; a **headless smoke script** that runs **N** waves and one Reborn non-interactively.

**Out of scope:** Phaser UI, Tauri shell, relay protocol changes, Steam/itch copy.

**Files allowed:** `packages/sim/**`, root `package.json` / `pnpm-workspace.yaml` only if adding a `pnpm` script entry for the smoke; `scripts/**` if created for smoke runner entry.

**Acceptance checks:**
- [ ] `pnpm --filter @zbd/sim test` passes; new tests cover Reborn transitions and persistence fields in save/load.
- [ ] New or extended **headless smoke** callable via `pnpm` (exact name in PR) completes **N** waves + **Reborn** with exit code **0**.
- [ ] Balance knobs (wave scaling, Reborn bonus) are **data-driven** or centralized constants with a short comment block.

**Rules:** Do not reduce existing sim test assertions without replacing them with stronger checks.

---

## Lane B — Art pipeline (style + manifest import)

**Goal:** Encode **docs/DESIGN.md** ART_RULES in a machine-readable **style guide** snippet (could live under `docs/` or `assets/`), and implement a **sprite import / atlas pipeline** driven by **one manifest** so **Kenney** or **AI** sources drop in via the same path (build or `pnpm` step).

**Out of scope:** Gameplay balance, relay, CI smoke logic (except if wiring an asset build step).

**Files allowed:** `assets/**`, `docs/**`, `apps/desktop/**` (Phaser load paths only), build config (`package.json`, `vite.config.ts`, small helper under `tools/` or `scripts/`).

**Acceptance checks:**
- [ ] Manifest lists sprites with frame names/paths; adding a new PNG requires **manifest + file** only.
- [ ] Strip still loads survivors/zombie/base from the pipeline output paths.
- [ ] Short README under `assets/` explains Kenney vs AI intake and **store disclosure** reminder.

**Rules:** No binary blobs in git beyond what the repo already uses; prefer documenting external AI exports.

---

## Lane C — Save/load hardening + CI smoke gate

**Goal:** Ensure **serialize/parse/migrate** paths stay stable across versions; wire the **headless smoke** from Lane A into **GitHub Actions** so it runs on **every PR** (Linux job is fine); keep Windows installer workflow as-is unless shared setup needs extraction.

**Out of scope:** Reborn design (consume Lane A’s script), art assets.

**Files allowed:** `.github/workflows/**`, `packages/sim/**` (save/migrate only if fixing bugs), `apps/desktop/src/game/runtime.ts` if save compatibility fixes are required, root `package.json`.

**Acceptance checks:**
- [ ] New workflow runs smoke on `pull_request` and fails the PR on failure.
- [ ] `pnpm test` (or documented subset) still runs in CI where practical.
- [ ] Doc note in `docs/VERTICAL_SLICE.md` updated if the exact `pnpm` command differs from placeholder text.

**Rules:** Never “fix” CI by skipping smoke; fix flakiness or determinism in the sim.
