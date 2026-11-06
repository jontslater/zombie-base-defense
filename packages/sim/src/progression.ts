import { applyAchievementUnlocks } from "./achievements.js";
import { applyCompanionUnlocks } from "./achievements.js";

/** Run after mutations that can unlock companions or comms milestones. */
export function finalizeProgression(state: import("./types.js").GameState): import("./types.js").GameState {
  return applyAchievementUnlocks(applyCompanionUnlocks(state));
}
