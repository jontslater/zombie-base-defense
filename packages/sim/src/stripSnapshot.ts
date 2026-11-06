import { campaignWaveNumberFromStageKey } from "./campaign.js";
import { TICKS_PER_SECOND } from "./constants.js";
import type { GameState } from "./types.js";
import { buildWaveCombat, survivorDps } from "./waves.js";
import { zombieKindForKill, type ZombieKindId } from "./zombieKinds.js";

/** Tuning for strip visuals only; does not affect `simTick`. */
const MARCH_CYCLE_TICKS = 140;
const FRAME_CYCLE_TICKS = 21;

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
  /**
   * 0–2 cycle for survivor/zombie pose frames (idle/walk vs attack vs hurt/die-adjacent),
   * deterministic from `tick` for the strip renderer only.
   */
  framePhase: 0 | 1 | 2;
};

export function stripZombieKindAtSlot(
  snap: StripCombatSnapshot,
  visibleSlotIndex: number,
  visibleCount: number,
): ZombieKindId {
  const r = snap.zombiesRemaining;
  const slot = Math.max(0, Math.min(visibleSlotIndex, visibleCount - 1));
  /** Front of the shambling pack (toward the base) uses higher spawn indices. */
  const spawnIndex = Math.max(0, r - 1 - slot);
  return zombieKindForKill({
    encounterWave: snap.encounterWave,
    isBoss: snap.isBoss,
    zombiesMax: snap.zombiesMax,
    spawnIndex,
  });
}

export function computeStripCombatSnapshot(state: GameState): StripCombatSnapshot | null {
  const c = state.combat;
  if (!c) return null;
  const encounterWave = campaignWaveNumberFromStageKey(state.currentStageKey);
  const dps = survivorDps(state);
  const def = buildWaveCombat(encounterWave);
  const march01 = (state.tick % MARCH_CYCLE_TICKS) / MARCH_CYCLE_TICKS;
  const swayRad = state.tick * 0.271828;
  const framePhase = Math.floor((state.tick % (FRAME_CYCLE_TICKS * 3)) / FRAME_CYCLE_TICKS) as 0 | 1 | 2;
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
    framePhase,
  };
}
