# Assets — intake and sprite atlas

## Sprite atlas pipeline

Strip combat art is served from **`generated/sprites-atlas.png`** + **`generated/sprites-atlas.json`**, built from **`sprite.manifest.json`** and the PNG paths it lists. The same step copies each sprite to **`generated/slices/<key>.png`** for plain `<img>` / CSS use.

- **Default art path:** run **`pnpm build:sprites`** (or `pnpm dev` / `pnpm --filter @zbd/desktop build`). That regenerates **`tools/generate-pixel-sprites.mjs`** output under `assets/sprites/` and `assets/ui/`, then packs the atlas.
- **Hand-painted or external PNGs:** drop files under `assets/` and list them in **`sprite.manifest.json`** (skip the generator for those keys, or add them to the script).
- **Phaser references** frame keys explicitly in `StripScene` (`apps/desktop/src/game/stripScene.ts`); new strip art needs matching keys there or atlas load will warn at runtime.

## Kenney (CC0)

Kenney art was replaced for **sprites and UI buttons**; see **`ASSETS.md`**. Kenney **audio** placeholders may remain under `audio/` until substituted.

## AI-generated art

Allowed when it follows **`art-rules.json`** (mirrors `docs/DESIGN.md` ART_RULES). Do **not** commit generated imagery you cannot license; document the tool and prompt in the PR when relevant.

**Store disclosure:** AI-assisted artwork must be disclosed on store pages per platform policy — see `docs/DESIGN.md`.

## Machine-readable style rules

- `assets/art-rules.json` — palette, facing, outline, and silhouette rules for tooling and contributors.
