#!/usr/bin/env node
/**
 * Builds assets/generated/sprites-atlas.png + sprites-atlas.json from assets/sprite.manifest.json.
 * Uses a simple row-major packer; Phaser loads the result via this.load.atlas("sprites", ...).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(REPO_ROOT, "assets");
const MANIFEST_PATH = path.join(ASSETS_DIR, "sprite.manifest.json");

async function main() {
  const raw = await fs.readFile(MANIFEST_PATH, "utf8");
  /** @type {{ version: number; output: { image: string; atlas: string }; padding?: number; sprites: { key: string; file: string }[] }} */
  const manifest = JSON.parse(raw);

  if (!manifest.sprites?.length) {
    throw new Error("sprite.manifest.json: no sprites defined");
  }

  const padding = typeof manifest.padding === "number" ? manifest.padding : 1;

  const entries = [];
  for (const row of manifest.sprites) {
    const abs = path.join(ASSETS_DIR, row.file);
    await fs.access(abs).catch(() => {
      throw new Error(`Missing sprite file for "${row.key}": ${row.file}`);
    });
    const meta = await sharp(abs).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) throw new Error(`Could not read dimensions: ${row.file}`);
    entries.push({ key: row.key, abs, w, h });
  }

  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.key)) throw new Error(`Duplicate manifest key: ${e.key}`);
    seen.add(e.key);
  }

  const maxRowWidth = 2048;
  let x = 0;
  let y = 0;
  let rowH = 0;
  let sheetW = 0;
  const placements = [];

  for (const e of entries) {
    const cellW = e.w + padding;
    const cellH = e.h + padding;
    if (x > 0 && x + cellW > maxRowWidth) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    placements.push({ ...e, px: x, py: y });
    rowH = Math.max(rowH, cellH);
    x += cellW;
    sheetW = Math.max(sheetW, x);
  }

  const sheetH = y + rowH;
  if (sheetW <= padding || sheetH <= padding) {
    throw new Error("Computed atlas size is invalid");
  }

  /** @type {import("sharp").OverlayOptions[]} */
  const composites = [];
  for (const p of placements) {
    composites.push({
      input: await sharp(p.abs).ensureAlpha().toBuffer(),
      left: p.px,
      top: p.py,
    });
  }

  const imageRel = manifest.output.image;
  const atlasRel = manifest.output.atlas;
  const imageName = path.basename(imageRel);
  const outImagePath = path.join(ASSETS_DIR, imageRel);
  const outAtlasPath = path.join(ASSETS_DIR, atlasRel);
  await fs.mkdir(path.dirname(outImagePath), { recursive: true });

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outImagePath);

  /** @type {Record<string, object>} */
  const frames = {};
  for (const p of placements) {
    frames[p.key] = {
      frame: { x: p.px, y: p.py, w: p.w, h: p.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
      sourceSize: { w: p.w, h: p.h },
    };
  }

  const atlasJson = {
    frames,
    meta: {
      app: "https://github.com/jontslater/zombie-base-defense",
      version: "1.0",
      image: imageName,
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
    },
  };

  await fs.writeFile(outAtlasPath, `${JSON.stringify(atlasJson, null, 2)}\n`, "utf8");

  const slicesDir = path.join(ASSETS_DIR, "generated/slices");
  await fs.mkdir(slicesDir, { recursive: true });
  for (const e of entries) {
    const dest = path.join(slicesDir, `${e.key}.png`);
    await fs.copyFile(e.abs, dest);
  }

  console.log(
    `Sprite atlas: ${entries.length} frames → ${path.relative(REPO_ROOT, outImagePath)} (${sheetW}×${sheetH}); slices → ${path.relative(REPO_ROOT, slicesDir)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
