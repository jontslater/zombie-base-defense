#!/usr/bin/env node
/**
 * Deterministic 32×32 palette pixel art for ZBD strip + UI.
 * Outputs PNGs under assets/sprites/ and assets/ui/ (see assets/sprite.manifest.json).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(REPO_ROOT, "assets");

const W = 32;
const H = 32;

/** @type {Record<string, [number, number, number, number]>} */
const C = {
  _: [0, 0, 0, 0],
  O: [16, 24, 32, 255], // outline
  G: [11, 15, 20, 255], // ground #0b0f14
  N: [42, 53, 68, 255], // chrome #2a3544
  L: [61, 81, 102, 255], // chrome hi
  T: [232, 238, 245, 255], // text #e8eef5
  A: [61, 139, 253, 255], // accent #3d8bfd
  Z: [110, 207, 90, 255], // zombie flesh (Phaser tints layers)
  Zd: [46, 120, 58, 255],
  // Rarity gems (match packages/sim RARITY_COLORS)
  Cm: [154, 165, 177, 255],
  Un: [46, 204, 113, 255],
  Ra: [52, 152, 219, 255],
  Ep: [155, 89, 182, 255],
  Lg: [241, 196, 15, 255],
  My: [230, 126, 34, 255],
  Ap: [231, 76, 60, 255],
};

function buf() {
  return Buffer.alloc(W * H * 4, 0);
}

function set(px, x, y, /** @type {keyof typeof C} */ k) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const c = C[k];
  if (!c || c[3] === 0) return;
  const i = (y * W + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = c[3];
}

function lineH(px, x0, x1, y, k) {
  for (let x = x0; x <= x1; x++) set(px, x, y, k);
}

function lineV(px, x, y0, y1, k) {
  for (let y = y0; y <= y1; y++) set(px, x, y, k);
}

function rectOutline(px, x0, y0, x1, y1, k = "O") {
  lineH(px, x0, x1, y0, k);
  lineH(px, x0, x1, y1, k);
  lineV(px, x0, y0, y1, k);
  lineV(px, x1, y0, y1, k);
}

function fill(px, x0, y0, x1, y1, k) {
  for (let y = y0; y <= y1; y++) lineH(px, x0, x1, y, k);
}

/**
 * Survivors face **right** (bulk / weapon on the right of the sprite).
 * @param {Buffer} px
 * @param {"tank"|"dps"|"support"|"striker"} role
 * @param {"idle"|"attack"} pose
 */
function drawSurvivor(px, role, pose) {
  // feet base y ~ 24-27
  const lift = pose === "attack" ? -1 : 0;
  const arm = pose === "attack" ? 3 : 0;

  // legs
  fill(px, 11, 25 + lift, 14, 27 + lift, "N");
  fill(px, 17, 25 + lift, 20, 27 + lift, "N");
  rectOutline(px, 10, 24 + lift, 21, 28 + lift);

  // body
  fill(px, 11, 16, 20, 24 + lift, "N");
  rectOutline(px, 10, 15 + lift, 21, 24 + lift);

  // head (right-facing: face toward x+)
  fill(px, 13, 9 + lift, 19, 15 + lift, "N");
  rectOutline(px, 12, 8 + lift, 20, 15 + lift);
  set(px, 17, 11 + lift, "T"); // eye
  set(px, 18, 12 + lift, "T"); // nose hint

  let accent = "A";
  if (role === "tank") {
    fill(px, 9, 16, 11, 22 + lift, "L"); // shield left
    rectOutline(px, 8, 15 + lift, 11, 22 + lift);
    accent = "L";
  } else if (role === "dps") {
    // rifle right
    fill(px, 21 + arm, 17 + lift, 26 + arm, 18 + lift, "L");
    rectOutline(px, 20 + arm, 16 + lift, 26 + arm, 19 + lift);
    set(px, 25 + arm, 17 + lift, "A"); // muzzle tip
  } else if (role === "support") {
    // tool / med cross on backpack left
    fill(px, 8, 14 + lift, 10, 18 + lift, "L");
    set(px, 9, 15 + lift, "A");
    set(px, 9, 17 + lift, "A");
  } else {
    // striker — dual batons
    fill(px, 20 + arm, 16 + lift, 23 + arm, 17 + lift, "L");
    fill(px, 20 + arm, 19 + lift, 23 + arm, 20 + lift, "L");
    rectOutline(px, 19 + arm, 15 + lift, 23 + arm, 21 + lift);
  }

  // role chest accent
  set(px, 15, 19 + lift, accent);
  set(px, 16, 20 + lift, "A");
}

/**
 * Zombies face **left** in source (heavy side / jaw on the left) — strip uses flipX true.
 * Frames: 0 = walk A, 1 = walk B, 2 = hit, 3 = death.
 */
function drawZombie(px, kind, frame) {
  if (frame === 3) {
    fill(px, 2, 24, 22, 27, "Zd");
    rectOutline(px, 1, 23, 23, 28);
    fill(px, 6, 21, 16, 24, "Z");
    if (kind === "boss") {
      fill(px, 5, 18, 15, 22, "Zd");
      rectOutline(px, 4, 17, 15, 22);
    }
    return;
  }

  const wobble = frame === 1 ? 1 : 0;
  const recoil = frame === 2 ? 2 : 0;
  const hitFlash = frame === 2;

  let bodyY0 = 14 - wobble;
  let bodyY1 = 24 - (kind === "boss" ? recoil : 0);

  if (kind === "boss") {
    fill(px, 4 + recoil, 8, 18 + recoil, 22, "Zd");
    rectOutline(px, 3 + recoil, 7, 19 + recoil, 23);
    fill(px, 6, 4, 14, 10, "Zd"); // crown
    rectOutline(px, 5, 3, 15, 10);
    for (let x = 7; x <= 13; x += 2) set(px, x, 5, "O");
    fill(px, 10, 12, 14, 15, "Z");
    set(px, 8 + recoil, 14, "T"); // eye glow
    if (hitFlash) {
      set(px, 12, 16, "Ap");
      set(px, 9, 18, "Ap");
    }
  } else {
    const wide = kind === "tank" ? 2 : 0;
    fill(px, 6 - wide + recoil, bodyY0, 17 + wide + recoil, bodyY1, "Z");
    rectOutline(px, 5 - wide + recoil, bodyY0 - 1, 18 + wide + recoil, bodyY1 + 1);
    fill(px, 4 - wide + recoil, 16, 7 - wide + recoil, 20, "Zd");
    rectOutline(px, 3 - wide + recoil, 15, 7 - wide + recoil, 20);
    set(px, 9 + wide + recoil, 12 + wobble, "T");
    if (hitFlash) {
      set(px, 10 + recoil, 17, "Ap");
      set(px, 14 + recoil, 19, "Ap");
    }
  }

  // arms
  fill(px, 2 + recoil, 17, 6 + recoil, 21, "Z");
  rectOutline(px, 1 + recoil, 16, 6 + recoil, 21);
  fill(px, 18 + recoil, 17, 22 + recoil, 21, "Z");
  rectOutline(px, 17 + recoil, 16, 22 + recoil, 21);

  // legs walk / hit stance
  if (frame === 0) {
    fill(px, 9, 25, 12, 27, "Zd");
    fill(px, 14, 26, 17, 28, "Zd");
  } else if (frame === 1) {
    fill(px, 9, 26, 12, 28, "Zd");
    fill(px, 14, 25, 17, 27, "Zd");
  } else {
    fill(px, 8 + recoil, 25, 13 + recoil, 28, "Zd");
    fill(px, 14 + recoil, 25, 19 + recoil, 28, "Zd");
  }
  rectOutline(px, 8 + recoil, 24, 18 + recoil, 28);

  if (kind === "spitter") {
    set(px, 5 + recoil, 17, hitFlash ? "Ap" : "A");
  }
}

function drawBaseCore(px) {
  fill(px, 10, 10, 22, 26, "N");
  rectOutline(px, 9, 9, 23, 27);
  fill(px, 13, 12, 19, 18, "G");
  rectOutline(px, 12, 11, 20, 18);
  fill(px, 14, 14, 18, 17, "A");
  rectOutline(px, 13, 13, 19, 18);
  // antenna
  lineV(px, 20, 4, 9, "O");
  set(px, 20, 4, "A");
  lineH(px, 18, 22, 24, "L");
}

function drawWall(px) {
  fill(px, 6, 10, 26, 26, "N");
  rectOutline(px, 5, 9, 27, 27);
  for (let y = 12; y <= 24; y += 4) lineH(px, 8, 24, y, "O");
}

function drawTurret(px) {
  fill(px, 10, 18, 22, 26, "N");
  rectOutline(px, 9, 17, 23, 27);
  fill(px, 14, 12, 18, 18, "L");
  rectOutline(px, 13, 11, 19, 18);
  lineH(px, 18, 26, 15, "O");
  set(px, 26, 15, "A");
}

function drawProjectile(px) {
  fill(px, 4, 14, 10, 17, "A");
  rectOutline(px, 3, 13, 10, 17);
  lineH(px, 10, 18, 15, "T");
}

function drawMuzzleFlash(px) {
  set(px, 16, 14, "T");
  set(px, 17, 15, "A");
  set(px, 18, 14, "A");
  set(px, 19, 16, "T");
  set(px, 20, 15, "L");
  set(px, 17, 17, "O");
}

function drawCompanion(px, id) {
  fill(px, 0, 0, 31, 31, "_");
  // small centered pets, face implied toward center (strip places near survivors)
  const o = "O";
  if (id === "dog") {
    fill(px, 10, 18, 22, 22, "N");
    rectOutline(px, 9, 17, 22, 22, o);
    fill(px, 12, 14, 18, 18, "N");
    rectOutline(px, 11, 13, 18, 18, o);
    lineH(px, 20, 24, 20, o);
  } else if (id === "cat") {
    fill(px, 11, 16, 20, 22, "N");
    rectOutline(px, 10, 15, 20, 22, o);
    set(px, 10, 12, o);
    set(px, 20, 12, o);
    lineH(px, 12, 18, 14, "L");
  } else if (id === "drone") {
    lineH(px, 8, 24, 16, o);
    lineV(px, 16, 12, 20, o);
    fill(px, 12, 18, 20, 21, "L");
    rectOutline(px, 11, 17, 20, 21, o);
    set(px, 18, 14, "A");
  } else if (id === "bot") {
    fill(px, 11, 14, 21, 22, "N");
    rectOutline(px, 10, 13, 21, 22, o);
    set(px, 14, 16, "A");
    set(px, 17, 16, "A");
  } else if (id === "raven") {
    lineH(px, 8, 20, 18, o);
    fill(px, 10, 16, 18, 19, "N");
    rectOutline(px, 9, 15, 18, 19, o);
    set(px, 20, 17, o);
  } else if (id === "droid_ball") {
    fill(px, 11, 15, 21, 25, "L");
    rectOutline(px, 10, 14, 21, 25, o);
    set(px, 16, 18, "A");
  } else if (id === "gecko") {
    lineH(px, 10, 22, 22, o);
    fill(px, 12, 18, 21, 21, "Un");
    rectOutline(px, 11, 17, 21, 21, o);
  } else if (id === "hedgehog") {
    fill(px, 12, 18, 20, 22, "N");
    rectOutline(px, 11, 17, 20, 22, o);
    for (let x = 9; x <= 23; x += 2) set(px, x, 16, o);
  }
}

function drawGem(px, /** @type {keyof typeof C} */ gem) {
  fill(px, 10, 8, 22, 24, "_");
  const body = gem;
  fill(px, 11, 10, 21, 20, body);
  rectOutline(px, 10, 9, 21, 20);
  lineH(px, 13, 19, 8, "T");
  lineV(px, 16, 11, 18, "T");
}

function drawWeaponIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  lineH(px, 8, 22, 16, "O");
  fill(px, 10, 15, 22, 17, "L");
  rectOutline(px, 9, 14, 22, 17);
  fill(px, 20, 13, 24, 14, "A");
  rectOutline(px, 19, 12, 24, 14);
}

function drawArmorIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  fill(px, 10, 8, 22, 24, "N");
  rectOutline(px, 9, 7, 23, 25);
  fill(px, 13, 10, 19, 16, "L");
  rectOutline(px, 12, 9, 19, 16);
  lineV(px, 16, 18, 24, "O");
}

function drawToolIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  lineH(px, 8, 18, 20, "O");
  fill(px, 9, 18, 20, 21, "L");
  rectOutline(px, 8, 17, 20, 21);
  fill(px, 20, 10, 24, 13, "A");
  rectOutline(px, 19, 9, 24, 13);
}

function drawTrinketIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  set(px, 16, 8, "O");
  for (let i = 0; i < 5; i++) {
    const x = 12 + i * 2;
    set(px, x, 14 - Math.abs(i - 2), "L");
    set(px, x, 15 - Math.abs(i - 2), "O");
  }
  set(px, 16, 20, "A");
}

function drawCurrencyIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  fill(px, 9, 6, 23, 25, "_");
  fill(px, 12, 8, 20, 24, "L");
  rectOutline(px, 11, 7, 21, 25);
  fill(px, 14, 10, 18, 22, "N");
  rectOutline(px, 13, 9, 18, 22);
  set(px, 16, 14, "A");
}

function drawScrapIcon(px) {
  fill(px, 0, 0, 31, 31, "_");
  for (let i = 0; i < 4; i++) {
    fill(px, 10 + i * 3, 18 - i, 15 + i * 2, 22 - i, "L");
    rectOutline(px, 9 + i * 3, 17 - i, 15 + i * 2, 22 - i);
  }
  set(px, 16, 12, "T");
}

function drawMaterialIcon(px, kind) {
  fill(px, 0, 0, 31, 31, "_");
  if (kind === "alloy") {
    fill(px, 10, 12, 22, 20, "N");
    rectOutline(px, 9, 11, 22, 20);
    lineH(px, 12, 20, 14, "T");
  } else if (kind === "battery") {
    fill(px, 13, 9, 19, 22, "L");
    rectOutline(px, 12, 8, 19, 22);
    set(px, 16, 12, "A");
  } else if (kind === "compound") {
    fill(px, 11, 12, 21, 20, "Un");
    rectOutline(px, 10, 11, 21, 20);
    lineV(px, 16, 8, 11, "O");
  } else if (kind === "fiber") {
    lineH(px, 10, 22, 12, "O");
    lineH(px, 11, 21, 16, "O");
    lineH(px, 12, 20, 20, "O");
  } else if (kind === "wiring") {
    lineH(px, 8, 24, 14, "O");
    lineV(px, 16, 10, 22, "O");
    lineH(px, 14, 22, 18, "O");
    set(px, 18, 14, "A");
  }
}

// UI chrome buttons (procedural replace Kenney)
function drawButtonSquare(px) {
  fill(px, 0, 0, 31, 31, "_");
  fill(px, 2, 2, 29, 29, "N");
  rectOutline(px, 1, 1, 30, 30);
  fill(px, 4, 4, 27, 27, "G");
  rectOutline(px, 3, 3, 28, 28);
}

function drawButtonRound(px) {
  drawButtonSquare(px);
  fill(px, 8, 6, 24, 12, "L");
  rectOutline(px, 7, 5, 24, 12);
}

function drawIconCircle(px) {
  fill(px, 0, 0, 31, 31, "_");
  fill(px, 8, 8, 24, 24, "N");
  rectOutline(px, 7, 7, 24, 24);
  fill(px, 11, 11, 21, 21, "G");
  rectOutline(px, 10, 10, 21, 21);
}

function drawIconCheck(px) {
  drawIconCircle(px);
  lineH(px, 10, 14, 18, "A");
  lineH(px, 12, 18, 16, "A");
  set(px, 19, 15, "A");
}

async function writePng(rel, drawFn) {
  const px = buf();
  drawFn(px);
  const out = path.join(ASSETS, rel);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp(px, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(out);
  return rel;
}

async function main() {
  const tasks = [];

  const survRoles = [
    ["tank", "tank"],
    ["dps", "dps"],
    ["support", "support"],
    ["striker", "striker"],
  ];

  for (const [roleKey, role] of survRoles) {
    for (const pose of ["idle", "attack"]) {
      tasks.push(
        writePng(`sprites/survivor_${roleKey}_${pose}.png`, (px) =>
          drawSurvivor(px, /** @type {*} */ (role), /** @type {*} */ (pose)),
        ),
      );
    }
  }

  const zKinds = ["walker", "runner", "tank", "spitter", "boomer", "lurker"];
  for (const k of zKinds) {
    tasks.push(writePng(`sprites/zombie_${k}_walk_a.png`, (px) => drawZombie(px, k, 0)));
    tasks.push(writePng(`sprites/zombie_${k}_walk_b.png`, (px) => drawZombie(px, k, 1)));
    tasks.push(writePng(`sprites/zombie_${k}_hit.png`, (px) => drawZombie(px, k, 2)));
    tasks.push(writePng(`sprites/zombie_${k}_death.png`, (px) => drawZombie(px, k, 3)));
  }

  for (const [fi, tag] of [
    [0, "walk_a"],
    [1, "walk_b"],
    [2, "hit"],
    [3, "death"],
  ]) {
    tasks.push(
      writePng(`sprites/zombie_boss_${tag}.png`, (px) => drawZombie(px, "boss", fi)),
    );
  }

  tasks.push(writePng("sprites/base_core.png", drawBaseCore));
  tasks.push(writePng("sprites/base.png", drawBaseCore)); // legacy atlas key
  tasks.push(writePng("sprites/wall.png", drawWall));
  tasks.push(writePng("sprites/turret.png", drawTurret));
  tasks.push(writePng("sprites/projectile.png", drawProjectile));
  tasks.push(writePng("sprites/muzzle_flash.png", drawMuzzleFlash));

  const companions = ["dog", "cat", "drone", "bot", "raven", "droid_ball", "gecko", "hedgehog"];
  for (const c of companions) {
    tasks.push(writePng(`sprites/companion_${c}.png`, (px) => drawCompanion(px, c)));
  }

  tasks.push(writePng("sprites/weapon_icon.png", drawWeaponIcon));

  const gearSlots = [
    ["icon_weapon", drawWeaponIcon],
    ["icon_armor", drawArmorIcon],
    ["icon_tool", drawToolIcon],
    ["icon_trinket", drawTrinketIcon],
  ];
  for (const [name, fn] of gearSlots) {
    tasks.push(writePng(`sprites/${name}.png`, fn));
  }

  const gems = [
    ["gem_common", "Cm"],
    ["gem_uncommon", "Un"],
    ["gem_rare", "Ra"],
    ["gem_epic", "Ep"],
    ["gem_legendary", "Lg"],
    ["gem_mythic", "My"],
    ["gem_apocalyptic", "Ap"],
  ];
  for (const [name, g] of gems) {
    tasks.push(writePng(`sprites/${name}.png`, (px) => drawGem(px, /** @type {*} */ (g))));
  }

  tasks.push(writePng("sprites/icon_currency.png", drawCurrencyIcon));
  tasks.push(writePng("sprites/icon_scrap.png", drawScrapIcon));
  tasks.push(writePng("sprites/icon_section.png", drawIconCircle));
  for (const m of ["alloy", "battery", "compound", "fiber", "wiring"]) {
    tasks.push(writePng(`sprites/material_${m}.png`, (px) => drawMaterialIcon(px, m)));
  }

  // Back-compat single keys used before multi-frame pass
  tasks.push(
    writePng("sprites/survivor.png", (px) => drawSurvivor(px, "dps", "idle")),
    writePng("sprites/survivor_alt.png", (px) => drawSurvivor(px, "tank", "idle")),
    writePng("sprites/zombie.png", (px) => drawZombie(px, "walker", 0)),
  );

  // UI folder — match paths referenced by desktop app
  tasks.push(
    writePng("ui/button_square_border.png", drawButtonSquare),
    writePng("ui/button_round_flat.png", drawButtonRound),
    writePng("ui/icon_circle.png", drawIconCircle),
    writePng("ui/icon_checkmark.png", drawIconCheck),
    writePng("ui/icon_armor.png", drawArmorIcon),
    writePng("ui/icon_tool.png", drawToolIcon),
    writePng("ui/star.png", drawTrinketIcon),
  );

  await Promise.all(tasks);
  console.log(
    `Generated ${tasks.length} pixel PNGs under ${path.relative(REPO_ROOT, ASSETS)} (32×32, ART_RULES palette).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
