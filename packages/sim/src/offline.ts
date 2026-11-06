import { loadFromJson, saveToJson } from "./save.js";
import { buildOfflineRaidReport } from "./offlineRewards.js";
import type { GameState } from "./types.js";
import type { OfflineRaidReport } from "./offlineRewards.js";

export type ApplyOfflineProgressResult = {
  state: GameState;
  report: OfflineRaidReport | null;
};

/**
 * @deprecated Offline no longer advances raw ticks; use `applyOfflineProgress` result.
 */
export function computeOfflineTicks(_savedAtMs: number, _nowMs: number): number {
  return 0;
}

export function applyOfflineProgress(
  state: GameState,
  savedAtMs: number,
  nowMs: number,
): ApplyOfflineProgressResult {
  const { state: next, report } = buildOfflineRaidReport(state, savedAtMs, nowMs);
  return { state: next, report };
}

export function loadWithOffline(json: string, nowMs: number): GameState {
  const { state, savedAtMs } = loadFromJson(json);
  return applyOfflineProgress(state, savedAtMs, nowMs).state;
}

export { saveToJson, loadFromJson };
