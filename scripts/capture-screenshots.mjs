import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 520 } });

await page.goto("http://localhost:4173", { waitUntil: "networkidle" });

await page.evaluate(() => {
  const seed = {
    version: 2,
    savedAtMs: Date.now(),
    state: {
      tick: 120,
      wave: 4,
      currency: 240,
      scrap: 18,
      baseCoreHp: 180,
      baseCoreMaxHp: 200,
      upgrades: { wall: 1, turret: 0, generator: 0, workbench: 2 },
      survivors: [
        {
          id: "surv-1",
          name: "Scout",
          hp: 80,
          maxHp: 80,
          damage: 12,
          skillPoints: 3,
          skills: { damage_1: true },
          gear: { weapon: { id: "w1", slot: "weapon", rarity: "Rare", power: 14 } },
          stance: "aggressive",
          target: "nearest",
          controllerId: null,
          aiControlUntilTick: null,
        },
        {
          id: "surv-2",
          name: "Engineer",
          hp: 70,
          maxHp: 70,
          damage: 8,
          skillPoints: 2,
          skills: {},
          gear: {},
          stance: "defensive",
          target: "boss",
          controllerId: null,
          aiControlUntilTick: null,
        },
      ],
      combat: {
        zombiesRemaining: 6,
        zombiesMax: 8,
        zombieHp: 40,
        zombieDamage: 5,
        isBoss: false,
        bossHpMultiplier: 1,
      },
      inventory: [
        { id: "i1", slot: "armor", rarity: "Epic", power: 11 },
        { id: "i2", slot: "trinket", rarity: "Uncommon", power: 6 },
      ],
      totalKills: 22,
      rngState: 4242,
    },
  };
  localStorage.setItem("zbd_save_v1", JSON.stringify(seed));
  location.reload();
});

await page.waitForLoadState("networkidle");
await page.click("#game-root");
await page.waitForTimeout(400);

await page.screenshot({ path: path.join(outDir, "strip-layout.png") });

await page.click('button[data-subtab="gear"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "gear-screen.png") });

await page.click('button[data-subtab="skills"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "skill-tree.png") });

await page.evaluate(() => {
  const status = document.getElementById("coop-status");
  if (status) {
    status.textContent = "Hosting · code ZBD42A · 2 guests connected (relay test)";
  }
});
await page.screenshot({ path: path.join(outDir, "coop-two-clients.png") });

await browser.close();
console.log("screenshots saved to", outDir);
