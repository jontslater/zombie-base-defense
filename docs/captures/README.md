# Captures

## Strip (`strip/`)

Recorded with `scripts/capture-strip.mjs` against a local preview (`pnpm --filter @zbd/desktop preview` on port **4173**).

| Files | Demo query |
| --- | --- |
| `strip-combat-*.webm/.gif/.png` | `?demo=combat` |
| `strip-boss-*.webm/.gif/.png` | `?demo=boss` |

Example:

```bash
pnpm --filter @zbd/desktop build
pnpm --filter @zbd/desktop preview
node scripts/capture-strip.mjs combat
node scripts/capture-strip.mjs boss
```
