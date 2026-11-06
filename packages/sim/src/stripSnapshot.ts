import { campaignWaveNumberFromStageKey } from "./campaign.js";
import { TICKS_PER_SECOND } from "./constants.js";
import type { GameState } from "./types.js";
import { buildWaveCombat, survivorDps } from "./waves.js";

/** Tuning for strip visuals only; does not affect `simTick`. */
const MARCH_CYCLE_TICKS = 140;

export type StripCombatSnapshot = {
  encounterWave: number;
  isBoss: boolean;
  dps: number;
  damagePerTick: number;
  /** HP of the zombie currently being damaged. */
  currentZombieHp: number;
  /** Per-zombie max HP for this encounter (same as `buildWaveCombat(encounterWave).zombieHp`). */
  zombieHpPerKill: number;
  zombiesRemaining: number;
  zombiesMax: number;
  /** 0–1 loop for marching/sway (deterministic from `tick`). */
  march01: number;
  swayRad: number;
};

export function computeStripCombatSnapshot(state: GameState): StripCombatSnapshot | null {
  const c = state.combat;
  if (!c) return null;
  const encounterWave = campaignWaveNumberFromStageKey(state.currentStageKey);
  const dps = survivorDps(state);
  const def = buildWaveCombat(encounterWave);
  const march01 = (state.tick % MARCH_CYCLE_TICKS) / MARCH_CYCLE_TICKS;
  const swayRad = state.tick * 0.271828;
  return {
    encounterWave,
    isBoss: c.isBoss,
    dps,
    damagePerTick: dps / TICKS_PER_SECOND,
    currentZombieHp: c.zombieHp,
    zombieHpPerKill: def.zombieHp,
    zombiesRemaining: c.zombiesRemaining,
    zombiesMax: c.zombiesMax,
    march01,
    swayRad,
  };
}
