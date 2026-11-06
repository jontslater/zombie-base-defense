/**
 * Headless smoke: advance sim until N waves are cleared, then one REBORN.
 * Usage: pnpm --filter @zbd/sim smoke [N]
 * Env: SMOKE_SEED (optional, default 4242)
 */

import type { BaseUpgradeId } from "../src/constants.js";
import { REBORN_MIN_WAVE, upgradeCostAtLevel } from "../src/constants.js";
import { applyCommand, type GameCommand } from "../src/commands.js";
import { createInitialState } from "../src/save.js";
import { advanceTicks } from "../src/tick.js";

function parseN(): number {
  const raw = process.argv[2];
  const n = raw ? parseInt(raw, 10) : 8;
  if (!Number.isFinite(n) || n < REBORN_MIN_WAVE) {
    console.error(
      `smoke: N must be an integer >= ${REBORN_MIN_WAVE} (got ${String(raw)})`,
    );
    process.exit(2);
  }
  return n;
}

function trySpendCurrency(state: ReturnType<typeof createInitialState>, step: number) {
  let s = state;
  const prefer: BaseUpgradeId[] = ["turret", "wall", "generator", "workbench"];
  for (const upgradeId of prefer) {
    const level = s.upgrades[upgradeId];
    const cost = upgradeCostAtLevel(level);
    if (s.currency >= cost) {
      return applyCommand(s, {
        type: "UPGRADE_BASE",
        id: `smoke-up-${step}-${upgradeId}`,
        playerId: "smoke",
        issuedAtTick: s.tick,
        upgradeId,
      });
    }
  }
  return s;
}

function main(): void {
  const N = parseN();
  const seed = Number.parseInt(process.env.SMOKE_SEED ?? "4242", 10) >>> 0;
  let state = createInitialState(seed);

  let guard = 0;
  const maxTicks = 15_000_000;
  let step = 0;
  // Idle between fights: need wave > N (meaning N waves cleared) and no active combat.
  while ((state.wave <= N || state.combat !== null) && guard < maxTicks) {
    state = trySpendCurrency(state, step);
    state = advanceTicks(state, 400);
    guard += 400;
    step += 1;
  }

  if (state.wave <= N || state.combat !== null) {
    console.error(
      `smoke: timeout before clearing ${N} waves (wave=${state.wave} combat=${state.combat ? "yes" : "no"})`,
    );
    process.exit(1);
  }

  const cmd: GameCommand = {
    type: "REBORN",
    id: "smoke-reborn",
    playerId: "smoke",
    issuedAtTick: state.tick,
  };
  const after = applyCommand(state, cmd);

  if (after.rebornCount !== 1 || after.wave !== 1 || after.combat !== null) {
    console.error(
      "smoke: REBORN failed expectations",
      JSON.stringify({
        rebornCount: after.rebornCount,
        wave: after.wave,
        combat: after.combat,
      }),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        wavesCleared: N,
        rebornCount: after.rebornCount,
        currencyAfterReborn: after.currency,
        lifetimeCurrencyEarned: after.lifetimeCurrencyEarned,
      },
      null,
      2,
    ),
  );
}

main();
