#!/usr/bin/env node
/**
 * Headless strip capture: PNG frames → 10s GIF, two stills, sprite contact sheet.
 * Requires: built sprites (pnpm build:sprites), preview server, playwright, ffmpeg, sharp.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT = path.join(REPO_ROOT, "docs/captures/strip");
const ASSETS = path.join(REPO_ROOT, "assets");
const FRAME_DIR = path.join(OUT, "frames");
const MANIFEST = path.join(ASSETS, "sprite.manifest.json");

const PREVIEW_PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

const FRAME_MS = 200;
const FRAME_COUNT = 50;

async function waitForHttp(url, maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function startPreview() {
  return spawn("pnpm", ["--filter", "@zbd/desktop", "exec", "vite", "preview", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)], {
    cwd: REPO_ROOT,
    stdio: "ignore",
  });
}

/** Save state used for an active-combat strip (bouncy sprites). */
function combatSeed() {
  return {
    version: 5,
    savedAtMs: Date.now(),
    state: {
      tick: 200,
      wave: 14,
      currentStageKey: 12,
      campaignHighestClearedKey: 15,
      currency: 320,
      scrap: 42,
      materials: { alloy: 3, battery: 2, compound: 1, fiber: 2, wiring: 1 },
      baseCoreHp: 190,
      baseCoreMaxHp: 200,
      upgrades: { wall: 2, turret: 1, generator: 1, workbench: 1 },
      survivors: [
        {
          id: "surv-1",
          name: "Shieldline",
          hp: 90,
          maxHp: 90,
          damage: 14,
          skillPoints: 2,
          skills: { damage_1: true },
          gear: { weapon: { id: "w1", slot: "weapon", rarity: "Rare", power: 16 } },
          stance: "defensive",
          target: "nearest",
          controllerId: null,
          aiControlUntilTick: null,
        },
        {
          id: "surv-2",
          name: "Burst",
          hp: 75,
          maxHp: 75,
          damage: 18,
          skillPoints: 1,
          skills: {},
          gear: {},
          stance: "aggressive",
          target: "boss",
          controllerId: null,
          aiControlUntilTick: null,
        },
      ],
      combat: {
        zombiesRemaining: 5,
        zombiesMax: 8,
        zombieHp: 120,
        zombieDamage: 6,
        isBoss: false,
        bossHpMultiplier: 1,
      },
      inventory: [],
      totalKills: 40,
      rngState: 9001,
      perimeterUnlocked: {},
      rebornCount: 0,
      lifetimeCurrencyEarned: 900,
    },
  };
}

async function captureFrames() {
  await fs.mkdir(FRAME_DIR, { recursive: true });
  await fs.mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 400, height: 80 } });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(
    (seed) => {
      localStorage.setItem("zbd_save_v1", JSON.stringify(seed));
      location.reload();
    },
    combatSeed(),
  );
  await page.waitForLoadState("networkidle");

  const canvas = page.locator("#game-root canvas");
  await canvas.waitFor({ state: "visible", timeout: 15000 });

  for (let i = 0; i < FRAME_COUNT; i++) {
    const png = await canvas.screenshot({ type: "png" });
    const n = String(i + 1).padStart(4, "0");
    await fs.writeFile(path.join(FRAME_DIR, `frame_${n}.png`), png);
    await page.waitForTimeout(FRAME_MS);
  }

  await browser.close();

  await sharp(path.join(FRAME_DIR, "frame_0001.png")).png().toFile(path.join(OUT, "strip-still-before.png"));
  await sharp(path.join(FRAME_DIR, "frame_0025.png")).png().toFile(path.join(OUT, "strip-still-after.png"));

  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(1000 / FRAME_MS),
    "-i",
    path.join(FRAME_DIR, "frame_%04d.png"),
    "-filter_complex",
    "[0:v] split [a][b]; [b] palettegen [p]; [a][p] paletteuse",
    path.join(OUT, "strip-10s.gif"),
  ]);

  await buildContactSheet();
}

async function buildContactSheet() {
  const raw = await fs.readFile(MANIFEST, "utf8");
  const manifest = JSON.parse(raw);
  const paths = manifest.sprites.map((r) => path.join(ASSETS, r.file));
  const cell = 40;
  const cols = 8;
  const rows = Math.ceil(paths.length / cols);
  const pad = 2;
  const sheetW = pad + cols * (cell + pad);
  const sheetH = pad + rows * (cell + pad);

  /** @type {import("sharp").OverlayOptions[]} */
  const composites = [];
  for (let i = 0; i < paths.length; i++) {
    const buf = await fs.readFile(paths[i]);
    const thumb = await sharp(buf)
      .resize(cell - 4, cell - 4, {
        fit: "contain",
        background: { r: 11, g: 15, b: 20, alpha: 1 },
      })
      .png()
      .toBuffer();
    const meta = await sharp(thumb).metadata();
    const tw = meta.width ?? cell - 4;
    const th = meta.height ?? cell - 4;
    const c = i % cols;
    const r = Math.floor(i / cols);
    const baseX = pad + c * (cell + pad);
    const baseY = pad + r * (cell + pad);
    const left = baseX + Math.floor((cell - tw) / 2);
    const top = baseY + Math.floor((cell - th) / 2);
    composites.push({ input: thumb, left, top });
  }

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 11, g: 15, b: 20, alpha: 255 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(OUT, "sprites-contact-sheet.png"));

  console.log("Contact sheet:", path.relative(REPO_ROOT, path.join(OUT, "sprites-contact-sheet.png")));
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });

  await run("pnpm", ["--filter", "@zbd/desktop", "build"], { cwd: REPO_ROOT });

  const preview = startPreview();
  try {
    await waitForHttp(BASE_URL);
    await captureFrames();
  } finally {
    preview.kill("SIGTERM");
  }
  console.log("Wrote strip captures under", path.relative(REPO_ROOT, OUT));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
