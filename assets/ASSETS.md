# Assets

Art and UI for the strip and panel use a **single coherent style** documented as **ART_RULES** in `docs/DESIGN.md` and `assets/art-rules.json`.

## Attribution and provenance

- **Strip / panel pixel sprites (32×32)**: Authored **in-repo** as deterministic pixel routines in `tools/generate-pixel-sprites.mjs`, exported to PNG, packed by `tools/build-sprite-atlas.mjs` into `generated/sprites-atlas.png` and `generated/sprites-atlas.json`, with per-frame copies in `generated/slices/`. **No third-party sprite sheets** are embedded for those layers.
- **Audio**: Legacy **Kenney CC0** impact and interface sounds remain under `audio/` until replaced — see table below.
- **Disclosure — AI-assisted**: **No machine-learning image generator** was used for this pass. The artwork is hand-authored procedural pixel code (same rationale as “original sprite set” in-repo). If a future pass uses generative image models, update this file and store listings accordingly.

## Audio (unchanged placeholders)

| File        | Source                         | Role              |
| ----------- | ------------------------------ | ----------------- |
| `hit.ogg`   | Kenney Impact Sounds (CC0)     | Combat hit on strip |
| `ui_click.ogg` | Kenney Interface Sounds (CC0) | Panel button      |
| `ui_select.ogg` | Kenney Interface Sounds (CC0) | Subtab change     |

## Sprite manifest (strip + panel icons)

- **Manifest**: `sprite.manifest.json`
- **Atlas output**: `generated/sprites-atlas.png` + `generated/sprites-atlas.json`
- **Slices** (for `<img>` / CSS): `generated/slices/<key>.png`

Regenerate after art or manifest changes:

```bash
pnpm build:sprites
```

This runs `generate-pixel-sprites.mjs` then `build-sprite-atlas.mjs`. `pnpm dev` / `pnpm --filter @zbd/desktop build` run the same step via `predev` / `prebuild`.

## Coverage (keys in the manifest)

| Category | Keys / notes |
| -------- | ------------ |
| **Survivors** | `survivor_<tank\|dps\|support\|striker>_(idle\|attack)` — face **right** in source (Phaser `flipX = false`). Stance mapping in `StripScene`: aggressive → DPS, defensive → tank, support → support. |
| **Zombies** | `zombie_<walker\|runner\|tank\|spitter\|boomer\|lurker>_(walk_a\|walk_b\|hit\|death)`; boss uses `zombie_boss_*`. Face **left** in source (strip uses `flipX = true`). |
| **Base / structures** | `base_core`, `wall`, `turret` |
| **FX** | `projectile`, `muzzle_flash` |
| **Companions** | `companion_dog`, `companion_cat`, `companion_drone`, `companion_bot`, `companion_raven`, `companion_droid_ball`, `companion_gecko`, `companion_hedgehog` |
| **Gear slot icons** | `icon_weapon`, `icon_armor`, `icon_tool`, `icon_trinket` (also `weapon_icon` alias for the weapon slot) |
| **Rarity gems** | `gem_common` … `gem_apocalyptic` (colors align with `RARITY_COLORS` in `packages/sim/src/constants.ts`) |
| **Economy** | `icon_currency`, `icon_scrap`, `material_<alloy\|battery\|compound\|fiber\|wiring>` |
| **UI chrome** | `ui/button_*.png`, `ui/icon_*.png` — generated to the same palette |

Legacy keys `survivor`, `survivor_alt`, `zombie`, `base` remain as aliases for tooling/tests.

## Strip layout notes

- Strip canvas: **400×80** px.
- Survivors on the **left**; zombies on the **right**; core **far right**.
- Companion strip is a **static preview row** of all eight companions (feature hook; not sim state).

## Captures

Strip captures (GIF, stills, contact sheet) are produced by `pnpm capture:strip` → `docs/captures/strip/` (see `docs/captures/strip/README.md`).
