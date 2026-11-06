/**
 * TBH-style campaign grid: 3 acts × 10 stages × 4 difficulty tiers (120 stages).
 * Legacy `GameState.wave` mirrors the current encounter's difficulty wave (1–120) for UI/tests.
 */

export const CAMPAIGN_NUM_ACTS = 3;
export const CAMPAIGN_STAGES_PER_ACT = 10;
export const CAMPAIGN_NUM_DIFFICULTY_TIERS = 4;

/** Inclusive last linear stage index (0–119). */
export const CAMPAIGN_LAST_STAGE_KEY = CAMPAIGN_NUM_ACTS * CAMPAIGN_STAGES_PER_ACT * CAMPAIGN_NUM_DIFFICULTY_TIERS - 1;

export const CAMPAIGN_DIFFICULTY_LABELS = ["Normal", "Hard", "Nightmare", "Hell"] as const;
export type CampaignDifficultyTier = 0 | 1 | 2 | 3;

export type CampaignCoords = {
  /** 0..3 */
  tier: CampaignDifficultyTier;
  /** 0..2 */
  act: number;
  /** 1..10 */
  stage: number;
};

export function coordsFromStageKey(key: number): CampaignCoords {
  const k = Math.max(0, Math.min(CAMPAIGN_LAST_STAGE_KEY, key));
  const tier = Math.floor(k / (CAMPAIGN_NUM_ACTS * CAMPAIGN_STAGES_PER_ACT)) as CampaignDifficultyTier;
  const withinTier = k % (CAMPAIGN_NUM_ACTS * CAMPAIGN_STAGES_PER_ACT);
  const act = Math.floor(withinTier / CAMPAIGN_STAGES_PER_ACT);
  const stage = (withinTier % CAMPAIGN_STAGES_PER_ACT) + 1;
  return { tier, act, stage };
}

export function stageKeyFromCoords(coords: CampaignCoords): number {
  const { tier, act, stage } = coords;
  if (tier < 0 || tier >= CAMPAIGN_NUM_DIFFICULTY_TIERS) return 0;
  if (act < 0 || act >= CAMPAIGN_NUM_ACTS) return 0;
  if (stage < 1 || stage > CAMPAIGN_STAGES_PER_ACT) return 0;
  return tier * (CAMPAIGN_NUM_ACTS * CAMPAIGN_STAGES_PER_ACT) + act * CAMPAIGN_STAGES_PER_ACT + (stage - 1);
}

/** `stage` is 1..10 */
export function stageKeyFromParts(tier: number, act: number, stage: number): number {
  return stageKeyFromCoords({
    tier: tier as CampaignDifficultyTier,
    act,
    stage,
  });
}

/** Difficulty wave 1–120 for scaling (`buildWaveCombat`, loot). */
export function campaignWaveNumberFromStageKey(key: number): number {
  const { tier, act, stage } = coordsFromStageKey(key);
  return tier * (CAMPAIGN_NUM_ACTS * CAMPAIGN_STAGES_PER_ACT) + act * CAMPAIGN_STAGES_PER_ACT + stage;
}

/** Inverse of `campaignWaveNumberFromStageKey` for wave in 1..120. */
export function stageKeyFromCampaignWave(wave: number): number {
  const w = Math.max(1, Math.min(CAMPAIGN_LAST_STAGE_KEY + 1, wave));
  return w - 1;
}

/** Boss on every 10th stage within an act (stage 10). */
export function campaignStageIsBoss(key: number): boolean {
  return coordsFromStageKey(key).stage === CAMPAIGN_STAGES_PER_ACT;
}

/**
 * After clearing the current stage: update highest cleared and next current position.
 * Farming (current ≤ highest before clear) keeps the same current key.
 */
export function advanceCampaignAfterStageClear(
  currentKey: number,
  highestClearedKey: number,
): { currentStageKey: number; campaignHighestClearedKey: number } {
  const c = Math.max(0, Math.min(CAMPAIGN_LAST_STAGE_KEY, currentKey));
  const prevHigh = highestClearedKey;
  const newHigh = Math.max(prevHigh, c);

  let nextCurrent = c;
  if (c > prevHigh) {
    nextCurrent = Math.min(c + 1, CAMPAIGN_LAST_STAGE_KEY);
  }

  return { currentStageKey: nextCurrent, campaignHighestClearedKey: newHigh };
}

export function shortCampaignLabel(key: number): string {
  const { tier, act, stage } = coordsFromStageKey(key);
  const d = CAMPAIGN_DIFFICULTY_LABELS[tier] ?? "?";
  return `T${tier + 1} A${act + 1}-${stage}${campaignStageIsBoss(key) ? "★" : ""} ${d}`;
}

export function formatCampaignSummary(currentKey: number, highestKey: number): string {
  const cur = shortCampaignLabel(currentKey);
  const hi =
    highestKey < 0 ? "—" : shortCampaignLabel(Math.min(highestKey, CAMPAIGN_LAST_STAGE_KEY));
  return `${cur} · best ${hi}`;
}

/** Compact label for the 400px strip (no “best” line). */
export function stripCampaignTag(currentKey: number): string {
  const { tier, act, stage } = coordsFromStageKey(currentKey);
  const boss = campaignStageIsBoss(currentKey) ? "★" : "";
  return `T${tier + 1} A${act + 1}-${stage}${boss}`;
}
