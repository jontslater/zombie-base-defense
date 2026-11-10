#!/usr/bin/env node
/**
 * Side-by-side TBH reference (cropped strip) + our strip capture.
 * Writes ONLY to /opt/cursor/artifacts/tbh-compare.png — never commits TBH assets.
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const TBH_REF =
  process.env.TBH_STRIP_REF ??
  "/home/ubuntu/.cursor/projects/agent-repos-zombie-base-defense/assets/tbh-1.jpg";
const TBH_CROP = {
  left: Number(process.env.TBH_CROP_LEFT ?? 360),
  top: Number(process.env.TBH_CROP_TOP ?? 465),
  width: Number(process.env.TBH_CROP_WIDTH ?? 300),
  height: Number(process.env.TBH_CROP_HEIGHT ?? 65),
};
const OUR_PNG =
  process.env.OUR_STRIP_PNG ?? path.join(REPO, "docs/captures/strip/hitfeel-after-combat.png");
const OUT = "/opt/cursor/artifacts/tbh-compare.png";

const STRIP_W = 400;
const STRIP_H = 80;

const tbhStrip = await sharp(TBH_REF)
  .extract(TBH_CROP)
  .resize(STRIP_W, STRIP_H, { fit: "cover" })
  .png()
  .toBuffer();

const ourStrip = await sharp(OUR_PNG).resize(STRIP_W, STRIP_H).png().toBuffer();

const labelH = 14;
const canvas = sharp({
  create: {
    width: STRIP_W,
    height: STRIP_H * 2 + labelH * 2 + 8,
    channels: 4,
    background: { r: 11, g: 15, b: 20, alpha: 1 },
  },
});

const labeled = await canvas
  .composite([
    { input: tbhStrip, top: labelH + 2, left: 0 },
    { input: ourStrip, top: labelH + STRIP_H + labelH + 6, left: 0 },
  ])
  .png()
  .toFile(OUT);

console.log(JSON.stringify({ ok: true, out: OUT, bytes: labeled.size }));

