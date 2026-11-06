#!/usr/bin/env node
/**
 * Record ~10s of the 400×80 strip in headless Chromium (Playwright),
 * plus a GIF (ffmpeg) and three still frames.
 *
 * Start preview first: `pnpm --filter @zbd/desktop build && pnpm --filter @zbd/desktop preview`
 */
import { chromium } from "playwright";
import { mkdirSync, renameSync, readdirSync, unlinkSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const outDir = "/opt/cursor/artifacts";
mkdirSync(outDir, { recursive: true });

const videoBasename = "strip-combat-10s.webm";
const videoPath = path.join(outDir, videoBasename);
const gifPath = path.join(outDir, "strip-combat-10s.gif");
const still1 = path.join(outDir, "strip-combat-still-1.png");
const still2 = path.join(outDir, "strip-combat-still-2.png");
const still3 = path.join(outDir, "strip-combat-still-3.png");

const browser = await chromium.launch({ headless: true });
const videoDir = path.join(outDir, `_pw-video-${Date.now()}`);
mkdirSync(videoDir, { recursive: true });

const ctx = await browser.newContext({
  viewport: { width: 400, height: 80 },
  recordVideo: { dir: videoDir, size: { width: 400, height: 80 } },
});
const page = await ctx.newPage();

await page.goto("http://localhost:4173/?demo=combat", { waitUntil: "networkidle" });
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

console.log(JSON.stringify({ videoPath, gifPath, still1, still2, still3 }, null, 2));
