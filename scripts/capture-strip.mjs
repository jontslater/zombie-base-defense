#!/usr/bin/env node
/**
 * Record ~10s of the 400×80 strip in headless Chromium (Playwright),
 * plus a GIF (ffmpeg) and three still frames under docs/captures/strip/.
 *
 * Usage:
 *   node scripts/capture-strip.mjs [combat|boss]
 *   node scripts/capture-strip.mjs --demo=boss
 *
 * Start preview first: `pnpm --filter @zbd/desktop build && pnpm --filter @zbd/desktop preview`
 */
import { chromium } from "playwright";
import { mkdirSync, renameSync, readdirSync, unlinkSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function parseDemo() {
  const fromFlag = process.argv.find((a) => a.startsWith("--demo="))?.split("=")[1];
  const positional = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
  const raw = fromFlag ?? positional ?? "combat";
  if (raw !== "combat" && raw !== "boss") {
    console.error('capture-strip: demo must be "combat" or "boss"');
    process.exit(2);
  }
  return raw;
}

const demo = parseDemo();
const label = demo === "boss" ? "boss" : "combat";

const stripDir = path.join(REPO_ROOT, "docs/captures/strip");
mkdirSync(stripDir, { recursive: true });

const videoBasename = `strip-${label}-10s.webm`;
const videoPath = path.join(stripDir, videoBasename);
const gifPath = path.join(stripDir, `strip-${label}-10s.gif`);
const still1 = path.join(stripDir, `strip-${label}-still-1.png`);
const still2 = path.join(stripDir, `strip-${label}-still-2.png`);
const still3 = path.join(stripDir, `strip-${label}-still-3.png`);

const browser = await chromium.launch({ headless: true });
const videoDir = path.join(stripDir, `_pw-video-${Date.now()}`);
mkdirSync(videoDir, { recursive: true });

const ctx = await browser.newContext({
  viewport: { width: 400, height: 80 },
  recordVideo: { dir: videoDir, size: { width: 400, height: 80 } },
});
const page = await ctx.newPage();

await page.goto(`http://localhost:4173/?demo=${demo}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: still1, clip: { x: 0, y: 0, width: 400, height: 80 } });

await page.waitForTimeout(3200);
await page.screenshot({ path: still2, clip: { x: 0, y: 0, width: 400, height: 80 } });

await page.waitForTimeout(3300);
await page.screenshot({ path: still3, clip: { x: 0, y: 0, width: 400, height: 80 } });

await page.waitForTimeout(2000);

await ctx.close();
await browser.close();

const recorded = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
if (recorded.length !== 1) {
  console.error("capture-strip: expected one .webm in", videoDir, "got", recorded);
  process.exit(1);
}

if (existsSync(videoPath)) unlinkSync(videoPath);
renameSync(path.join(videoDir, recorded[0]), videoPath);

try {
  rmSync(videoDir, { recursive: true, force: true });
} catch {
  /* ignore */
}

try {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      videoPath,
      "-vf",
      "fps=12,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      gifPath,
    ],
    { stdio: "pipe" },
  );
} catch {
  console.warn("capture-strip: ffmpeg not available or failed; WebM and PNGs still saved");
}

console.log(JSON.stringify({ demo, videoPath, gifPath, still1, still2, still3 }, null, 2));
