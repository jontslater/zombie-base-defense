import { OFFLINE_CAP_MS, TICKS_PER_SECOND } from "./constants.js";
import { loadFromJson, saveToJson } from "./save.js";
import { advanceTicks } from "./tick.js";
import type { GameState } from "./types.js";

export function computeOfflineTicks(savedAtMs: number, nowMs: number): number {
  const delta = Math.max(0, Math.min(OFFLINE_CAP_MS, nowMs - savedAtMs));
  return Math.floor((delta / 1000) * TICKS_PER_SECOND);
}

export function applyOfflineProgress(
  state: GameState,
  savedAtMs: number,
  nowMs: number,
): GameState {
  const ticks = computeOfflineTicks(savedAtMs, nowMs);
  if (ticks <= 0) return state;
  return advanceTicks(state, ticks);
}

export function loadWithOffline(json: string, nowMs: number): GameState {
  const { state, savedAtMs } = loadFromJson(json);
  return applyOfflineProgress(state, savedAtMs, nowMs);
}

export { saveToJson, loadFromJson };
