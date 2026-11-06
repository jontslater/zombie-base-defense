import { campaignWaveNumberFromStageKey } from "./campaign.js";
import type { GameState } from "./types.js";
import { buildWaveCombat } from "./waves.js";

export type DemoCombatKind = "mid_fight" | "boss";

/**
 * Deterministic save state for strip demos (?demo=combat / ?demo=boss, or VITE_DEMO=1).
 * Mid-fight with several survivors and a dense wave; does not go through commands
 * so it stays fixed for captures.
 */
export function createDemoCombatState(seed: number, kind: DemoCombatKind): GameState {
  const encounterWave =
    kind === "boss" ? campaignWaveNumberFromStageKey(9) : campaignWaveNumberFromStageKey(14);
  const combatDef = buildWaveCombat(encounterWave);

  const denseRemaining =
    kind === "boss"
      ? Math.max(1, Math.min(combatDef.zombiesMax, 5))
      : Math.max(8, Math.min(combatDef.zombiesMax, 20));

  const zombieHp =
    kind === "boss"
      ? combatDef.zombieHp * 0.55
      : Math.min(combatDef.zombieHp * 0.9, combatDef.zombieHp - 1);

  const isBoss = combatDef.isBoss;

  return {
    tick: 81234,
    wave: encounterWave,
    currentStageKey: kind === "boss" ? 9 : 14,
    campaignHighestClearedKey: 12,
    currency: 12840,
    scrap: 64,
    materials: {
      alloy: 4,
      battery: 2,
      compound: 1,
      fiber: 3,
      wiring: 2,
    },
    baseCoreHp: 165,
    baseCoreMaxHp: 200,
    perimeterUnlocked: {},
    upgrades: {
      wall: 2,
      turret: 1,
      generator: 1,
      workbench: 1,
    },
    survivors: [
      {
        id: "surv-1",
        name: "Scout",
        role: "hunter",
        hp: 72,
        maxHp: 80,
        damage: 14,
        skillPoints: 2,
        skills: { hu_precision: 1 },
        gear: {
          weapon: { id: "w1", slot: "weapon", rarity: "Rare", power: 14 },
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
        hp: 58,
        maxHp: 70,
        damage: 9,
        skillPoints: 1,
        skills: { en_turret: 1 },
        gear: {},
        stance: "defensive",
        target: "nearest",
        controllerId: null,
        aiControlUntilTick: null,
      },
      {
        id: "surv-3",
        name: "Doc",
        role: "medic",
        hp: 68,
        maxHp: 75,
        damage: 7,
        skillPoints: 2,
        skills: { me_patch: 1 },
        gear: {},
        stance: "support",
        target: "weakest",
        controllerId: null,
        aiControlUntilTick: null,
      },
      {
        id: "surv-4",
        name: "Brick",
        role: "brawler",
        hp: 90,
        maxHp: 95,
        damage: 11,
        skillPoints: 0,
        skills: { bl_strike: 2 },
        gear: {},
        stance: "aggressive",
        target: isBoss ? "boss" : "nearest",
        controllerId: null,
        aiControlUntilTick: null,
      },
    ],
    combat: {
      zombiesRemaining: denseRemaining,
      zombiesMax: combatDef.zombiesMax,
      zombieHp,
      zombieDamage: combatDef.zombieDamage,
      isBoss,
      bossHpMultiplier: combatDef.bossHpMultiplier,
    },
    inventory: [],
    totalKills: 180,
    rebornCount: 0,
    lifetimeCurrencyEarned: 25000,
    rngState: seed >>> 0,
  };
}
