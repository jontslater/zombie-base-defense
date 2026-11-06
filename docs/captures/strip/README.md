# Strip captures

Artifacts here are produced by the capture pipeline for PRs and reviews.

| File | Description |
| --- | --- |
| `strip-still-before.png` | First frame of the capture run |
| `strip-still-after.png` | Mid-sequence still (~5s) |
| `strip-10s.gif` | 10s loop of the strip at 5 fps |
| `sprites-contact-sheet.png` | All manifest frames in a grid |

Regenerate (after `pnpm install` and Playwright browsers):

```bash
pnpm exec playwright install chromium
pnpm capture:strip
```

Intermediate PNG sequences are written to `frames/` (gitignored) and can be deleted after a successful run.
