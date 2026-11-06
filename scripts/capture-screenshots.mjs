import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 520 } });

await page.goto("http://localhost:4173", { waitUntil: "networkidle" });

await page.evaluate(() => {
  const seed = {
    version: 10,
    savedAtMs: Date.now() - 6 * 60 * 60 * 1000,
    state: {
      tick: 120,
      wave: 4,
      currentStageKey: 3,
      campaignHighestClearedKey: 5,
      currency: 240,
      scrap: 18,
      gems: 12,
      perimeterUnlocked: { relay_alpha: true, fence_lamps_row2: true },
      materials: {
        alloy: 2,
        battery: 1,
        compound: 0,
        fiber: 1,
        wiring: 0,
      },
      baseCoreHp: 180,
      baseCoreMaxHp: 200,
      upgrades: { wall: 1, turret: 0, generator: 0, workbench: 2 },
      survivors: [
        {
          id: "surv-1",
          name: "Scout",
          role: "hunter",
          hp: 80,
          maxHp: 80,
          damage: 12,
          skillPoints: 3,
          skills: { hu_precision: 2 },
          gear: {
            weapon: {
              id: "w1",
              slot: "weapon",
              rarity: "Rare",
              power: 14,
              sockets: [{ id: "rg1", kind: "ruby", tier: 1 }],
              affixes: [{ id: "sharp", value: 4 }],
            },
          },
          stance: "aggressive",
          target: "nearest",
          controllerId: null,
          aiControlUntilTick: null,
        },
        {
          id: "surv-2",
          name: "Engineer",
          role: "engineer",
          hp: 70,
          maxHp: 70,
          damage: 8,
          skillPoints: 2,
          skills: { en_turret: 1 },
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
        {
          id: "i1",
          slot: "armor",
          rarity: "Epic",
          power: 11,
          sockets: [null],
          affixes: [{ id: "reinforced", value: 6 }],
        },
        {
          id: "i2",
          slot: "trinket",
          rarity: "Uncommon",
          power: 6,
          sockets: [],
          affixes: [],
        },
      ],
      gemInventory: [
        { id: "g1", kind: "ruby", tier: 1 },
        { id: "g2", kind: "sapphire", tier: 1 },
        { id: "g3", kind: "topaz", tier: 2 },
      ],
      totalKills: 22,
      rebornCount: 0,
      lifetimeCurrencyEarned: 240,
      rngState: 4242,
    },
  };
  localStorage.setItem("zbd_save_v1", JSON.stringify(seed));
  location.reload();
});

await page.waitForLoadState("networkidle");
await page.screenshot({ path: path.join(outDir, "raid-report-overlay.png") });
await page
  .locator(".raid-report-actions button")
  .first()
  .click({ timeout: 10_000 })
  .catch(() => {});
await page.evaluate(() => {
  document.body.classList.remove("expanded");
  const panel = document.getElementById("panel");
  panel?.classList.add("hidden");
  panel?.setAttribute("aria-hidden", "true");
});
await page.click("#game-root");
await page.waitForTimeout(400);

await page.screenshot({ path: path.join(outDir, "strip-layout.png") });
await page.screenshot({
  path: path.join(outDir, "strip-400x80.png"),
  clip: { x: 0, y: 0, width: 400, height: 80 },
});

await page.evaluate(() => {
  document.getElementById("campaign-grid-root")?.scrollIntoView({ block: "nearest" });
});
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "campaign-panel.png") });

await page.click('button[data-subtab="workbench"]');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "workbench-gems-sockets.png") });

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stripScript = path.join(__dirname, "capture-strip.mjs");
const stripRun = spawnSync(process.execPath, [stripScript], { stdio: "inherit" });
if (stripRun.status !== 0) {
  console.warn("capture-strip.mjs exited", stripRun.status);
}
