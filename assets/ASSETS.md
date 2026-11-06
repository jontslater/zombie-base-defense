# Assets

All art and audio in this directory are from [Kenney.nl](https://kenney.nl) packs, licensed **CC0 1.0** (public domain). Credit is appreciated but not required — see [Kenney support / license](https://kenney.nl/support).

No AI-generated images are included.

## Source packs

| Pack | URL | License | Used for |
| --- | --- | --- | --- |
| Top-down Shooter | https://kenney.nl/assets/top-down-shooter | CC0 1.0 | Survivors, zombie base sprite (tinted in-game), weapon icon |
| Tower Defense Kit | https://kenney.nl/assets/tower-defense-kit | CC0 1.0 | Base core, walls, turrets, projectiles |
| UI Pack | https://kenney.nl/assets/ui-pack | CC0 1.0 | Panel button chrome and icons |
| Impact Sounds | https://kenney.nl/assets/impact-sounds | CC0 1.0 | Combat hit feedback |
| Interface Sounds | https://kenney.nl/assets/interface-sounds | CC0 1.0 | Panel click / select feedback |

Packs were downloaded from Kenney.nl inside the development environment (November 2026).

## Sprite manifest (strip combat art)

Strip Phaser sprites are listed in **`sprite.manifest.json`** and packed to **`generated/sprites-atlas.png`** + **`generated/sprites-atlas.json`** (plus **`generated/slices/*.png`** for DOM/CSS). See **`README.md`** in this folder for Kenney vs AI intake. Rebuild with `pnpm build:sprites` or via `pnpm dev` / `pnpm --filter @zbd/desktop build`.

## Files in this repo

### `sprites/`

| File | Kenney source | Role |
| --- | --- | --- |
| `survivor.png` | Top-down Shooter · Survivor 1 · `survivor1_gun.png` | Primary survivor (left, faces right) |
| `survivor_alt.png` | Top-down Shooter · Soldier 1 · `soldier1_gun.png` | Second survivor variant |
| `zombie.png` | Top-down Shooter · Zombie 1 · `zoimbie1_gun.png` | Zombie (right, faces left; green tint in Phaser) |
| `base.png` | Tower Defense Kit · `tile-spawn.png` | Base core on the far right |
| `wall.png` | Tower Defense Kit · `wood-structure-high.png` | Wall segments by upgrade level |
| `turret.png` | Tower Defense Kit · `weapon-turret.png` | Turret by upgrade level |
| `projectile.png` | Tower Defense Kit · `weapon-ammo-bullet.png` | Strip combat bullets |
| `weapon_icon.png` | Top-down Shooter · `weapon_gun.png` | Gear panel weapon slot icon |

### `ui/`

| File | Kenney source | Role |
| --- | --- | --- |
| `button_round_flat.png` | UI Pack · Blue Default | Subtab / pill button background |
| `button_square_border.png` | UI Pack · Blue Default | Primary panel button background |
| `icon_checkmark.png` | UI Pack | Skill owned indicator |
| `icon_circle.png` | UI Pack | Generic slot marker |
| `icon_armor.png` | UI Pack · `icon_outline_square.png` | Armor slot icon |
| `icon_tool.png` | Top-down Shooter · `weapon_machine.png` | Tool slot icon |
| `star.png` | UI Pack | Trinket slot icon |

### `audio/`

| File | Kenney source | Role |
| --- | --- | --- |
| `hit.ogg` | Impact Sounds · `impactGeneric_light_004.ogg` | Strip hit when zombies take damage |
| `ui_click.ogg` | Interface Sounds · `click_001.ogg` | Panel button press |
| `ui_select.ogg` | Interface Sounds · `select_004.ogg` | Subtab change |

## Layout notes

- Strip canvas: **400×80** px.
- Survivors on the **left**, `flipX = false` (face right).
- Zombies on the **right**, `flipX = true` (face left).
- Sprites are scaled in Phaser to stay readable at strip size.
