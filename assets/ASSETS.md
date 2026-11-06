# Assets

## Current art mix

**Strip combat sprites** (`sprites/*.png` listed in `sprite.manifest.json`), **Phaser atlas FX** (`hit`, `muzzle`, `projectile`), **companion thumbnails**, and **gear slot icons** (weapon, armor, tool, trinket) plus **gem socket color icons** are **AI-generated or AI-assisted** pixel art, exported to match `docs/DESIGN.md` ART_RULES (and `assets/art-rules.json`). **Disclose AI-assisted artwork on store listings** — see `docs/STORE.md`.

**UI chrome and audio** still use **Kenney CC0** packs where noted below (buttons, some panel chrome, hit/interface sounds).

## Kenney (CC0) — remaining files

Attribution for files still sourced from [Kenney.nl](https://kenney.nl), licensed **CC0 1.0**.

| Pack | URL | License | Used for |
| --- | --- | --- | --- |
| UI Pack | https://kenney.nl/assets/ui-pack | CC0 1.0 | Panel button backgrounds, checkmarks, section markers |
| Impact Sounds | https://kenney.nl/assets/impact-sounds | CC0 1.0 | Combat hit feedback |
| Interface Sounds | https://kenney.nl/assets/interface-sounds | CC0 1.0 | Panel click / select feedback |

Previously: Top-down Shooter and Tower Defense Kit placeholders for strip sprites — **replaced** by the AI art pass listed in the manifest.

## Sprite manifest (strip + DOM slices)

Strip Phaser sprites are listed in **`sprite.manifest.json`** and packed to **`generated/sprites-atlas.png`** + **`generated/sprites-atlas.json`** (plus **`generated/slices/<key>.png`** for `<img>` / CSS). Rebuild with **`pnpm build:sprites`** from the repo root (or `pnpm dev` / `pnpm --filter @zbd/desktop build`).

### `sprites/` (atlas sources)

| File / key | Source | Role |
| --- | --- | --- |
| `survivor*.png`, `survivor_alt*.png`, `survivor_melee*.png` | AI | Legacy gunner, soldier, melee stance frames (unused by strip when per-role sprites exist) |
| `survivor_<role>.png` (+ `_attack`, `_hurt`) | AI | Per TBH role strip frames (`brawler` … `warden`); see `assets/zombie-ai-roles.manifest.json` |
| `shambler*` … `boss*` | AI | Per-kind zombie walk / attack / die |
| `zombie.png` | AI | Legacy key (shambler walk) |
| `base.png`, `wall.png`, `turret.png` | AI | Base core, walls, turrets |
| `projectile.png`, `hit.png`, `muzzle.png` | AI | Strip combat FX |
| `weapon_icon.png` … `trinket_icon.png`, `gem_*.png` | AI | Gear + gem color icons |
| `companion_*.png` | AI | Companion strip / list thumbs (matches sim `spriteKey`) |

### `ui/`

| File | Source | Role |
| --- | --- | --- |
| `button_round_flat.png` | Kenney UI Pack | Subtab / pill button background |
| `button_square_border.png` | Kenney UI Pack | Primary panel button background |
| `icon_checkmark.png` | Kenney UI Pack | Skill owned indicator |
| `icon_circle.png` | Kenney UI Pack | Generic slot marker |

### `audio/`

| File | Source |
| --- | --- |
| `hit.ogg` | Kenney Impact Sounds |
| `ui_click.ogg` | Kenney Interface Sounds |
| `ui_select.ogg` | Kenney Interface Sounds |

## Layout notes

- Strip canvas: **400×80** px.
- Sprites target **32×32 or 64×64** source frames at 1×; scale in Phaser as needed.
