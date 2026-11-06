# Assets — intake and sprite atlas

## Sprite atlas pipeline

Strip combat art is served from **`generated/sprites-atlas.png`** + **`generated/sprites-atlas.json`**, built from **`sprite.manifest.json`** and the PNG paths it lists. The same step copies each sprite to **`generated/slices/<key>.png`** for plain `<img>` / CSS use (for example the gear panel weapon icon).

- **Add or swap art:** copy PNGs under `assets/` (typically `sprites/`), add or update a row in `assets/sprite.manifest.json`, then run `pnpm build:sprites` from the repo root (or use `pnpm dev` / `pnpm --filter @zbd/desktop build`, which run the same step first).
- **No Phaser code changes** are required for new frames as long as the logical `key` matches what `StripScene` uses (`survivor`, `zombie`, `base`, etc.).

Kenney packs and AI-generated exports both follow the same path: **manifest + files**.

## Kenney (CC0)

UI chrome and audio still use Kenney packs where listed in `ASSETS.md`.

## AI-generated art

**Current strip sprites, companions, and several panel icons are AI-assisted** (see `ASSETS.md` and `docs/STORE.md` for disclosure text). Allowed when it follows **`art-rules.json`** (mirrors `docs/DESIGN.md` ART_RULES). Do **not** commit generated imagery you cannot license; document the tool and prompt in the PR when relevant.

**Store disclosure:** AI-assisted artwork must be disclosed on store pages per platform policy — see `docs/DESIGN.md` and **`docs/STORE.md`**.

## Machine-readable style rules

- `assets/art-rules.json` — palette, facing, outline, and silhouette rules for tooling and contributors.
