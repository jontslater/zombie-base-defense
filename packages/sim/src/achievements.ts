import { BOSS_EVERY_N_WAVES, type AchievementId } from "./constants.js";
import {
  CAMPAIGN_LAST_STAGE_KEY,
  campaignStageIsBoss,
  campaignWaveNumberFromStageKey,
} from "./campaign.js";
import { COMPANIONS, companionUnlockMet } from "./companions.js";
import { perimeterUnlockedCount } from "./perimeter.js";
import type { GameState } from "./types.js";
import { MATERIAL_IDS } from "./constants.js";

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "m_w01", title: "First Contact", description: "Clear 1 wave." },
  { id: "m_w05", title: "Perimeter Check", description: "Clear 5 waves." },
  { id: "m_w10", title: "Decibels Rising", description: "Clear 10 waves." },
  { id: "m_w25", title: "Steady Cadence", description: "Clear 25 waves." },
  { id: "m_w50", title: "Sustained Fire", description: "Clear 50 waves." },
  { id: "m_w100", title: "Long Haul", description: "Clear 100 waves." },
  { id: "m_b1", title: "Big Game", description: "Clear 1 boss encounter." },
  { id: "m_b3", title: "Heavy Lifting", description: "Clear 3 boss encounters." },
  { id: "m_b5", title: "Trophy Wall", description: "Clear 5 boss encounters." },
  { id: "m_b10", title: "Apex Routine", description: "Clear 10 boss encounters." },
  { id: "m_c10", title: "City Limits", description: "Reach campaign wave 10." },
  { id: "m_c30", title: "Midtown Sweep", description: "Reach campaign wave 30." },
  { id: "m_c60", title: "Grid Runner", description: "Reach campaign wave 60." },
  { id: "m_c90", title: "Far Relay", description: "Reach campaign wave 90." },
  { id: "m_c120", title: "Hell's Door", description: "Clear the final stage (wave 120)." },
  { id: "m_rb1", title: "Phoenix Form", description: "Reborn once." },
  { id: "m_rb3", title: "Exodus Log", description: "Reborn 3 times." },
  { id: "m_rb5", title: "Rolling Memorial", description: "Reborn 5 times." },
  { id: "m_en5", title: "Bench Warrant", description: "Enhance gear 5 times." },
  { id: "m_rr5", title: "Second Pass", description: "Reroll gear 5 times." },
  { id: "m_sv10", title: "Breakdown", description: "Salvage gear 10 times." },
  { id: "m_syn1", title: "Ninefold", description: "Complete one synthesis combine." },
  { id: "m_forge3", title: "Forged Line", description: "Use Alchemy Forge 3 times." },
  { id: "m_mat50", title: "Stockpile", description: "Hold 50 combined material units." },
  { id: "m_mat200", title: "Quartermaster", description: "Hold 200 combined material units." },
  { id: "m_per1", title: "Fence Lit", description: "Unlock 1 perimeter node." },
  { id: "m_per3", title: "Mesh Wide", description: "Unlock 3 perimeter nodes." },
  { id: "m_per5", title: "Relay Backbone", description: "Unlock all perimeter nodes." },
  { id: "m_off1k", title: "Stale Air", description: "Accrue 1k offline sim ticks." },
  { id: "m_off10k", title: "Return Brief", description: "Accrue 10k offline sim ticks." },
  { id: "m_k500", title: "Census", description: "Reach 500 total kills." },
  { id: "m_comp2", title: "Pack Bond", description: "Unlock 2 companions." },
] as const;

const defsById: Record<AchievementId, AchievementDef> = {} as Record<AchievementId, AchievementDef>;
for (const a of ACHIEVEMENTS) {
  defsById[a.id] = a;
}

export function achievementDef(id: AchievementId): AchievementDef | undefined {
  return defsById[id];
}

function materialSum(state: GameState): number {
  let s = 0;
  for (const id of MATERIAL_IDS) {
    s += state.materials[id] ?? 0;
  }
  return s;
}

function companionUnlockedCount(state: GameState): number {
  return COMPANIONS.filter((c) => state.companionsUnlocked[c.id]).length;
}

/** Whether this milestone condition is satisfied (ignores whether already unlocked). */
export function achievementConditionMet(state: GameState, id: AchievementId): boolean {
  const m = state.meta;
  const bestWave =
    state.campaignHighestClearedKey < 0
      ? 0
      : campaignWaveNumberFromStageKey(state.campaignHighestClearedKey);
  switch (id) {
    case "m_w01":
      return m.lifetimeWavesCleared >= 1;
    case "m_w05":
      return m.lifetimeWavesCleared >= 5;
    case "m_w10":
      return m.lifetimeWavesCleared >= 10;
    case "m_w25":
      return m.lifetimeWavesCleared >= 25;
    case "m_w50":
      return m.lifetimeWavesCleared >= 50;
    case "m_w100":
      return m.lifetimeWavesCleared >= 100;
    case "m_b1":
      return m.lifetimeBossClears >= 1;
    case "m_b3":
      return m.lifetimeBossClears >= 3;
    case "m_b5":
      return m.lifetimeBossClears >= 5;
    case "m_b10":
      return m.lifetimeBossClears >= 10;
    case "m_c10":
      return state.campaignHighestClearedKey >= 0 && bestWave >= 10;
    case "m_c30":
      return state.campaignHighestClearedKey >= 0 && bestWave >= 30;
    case "m_c60":
      return state.campaignHighestClearedKey >= 0 && bestWave >= 60;
    case "m_c90":
      return state.campaignHighestClearedKey >= 0 && bestWave >= 90;
    case "m_c120":
      return state.campaignHighestClearedKey >= CAMPAIGN_LAST_STAGE_KEY;
    case "m_rb1":
      return state.rebornCount >= 1;
    case "m_rb3":
      return state.rebornCount >= 3;
    case "m_rb5":
      return state.rebornCount >= 5;
    case "m_en5":
      return m.lifetimeWorkbenchEnhances >= 5;
    case "m_rr5":
      return m.lifetimeWorkbenchRerolls >= 5;
    case "m_sv10":
      return m.lifetimeSalvages >= 10;
    case "m_syn1":
      return m.lifetimeSynthesisCombines >= 1;
    case "m_forge3":
      return m.lifetimeAlchemyForges >= 3;
    case "m_mat50":
      return materialSum(state) >= 50;
    case "m_mat200":
      return materialSum(state) >= 200;
    case "m_per1":
      return perimeterUnlockedCount(state) >= 1;
    case "m_per3":
      return perimeterUnlockedCount(state) >= 3;
    case "m_per5":
      return perimeterUnlockedCount(state) >= 5;
    case "m_off1k":
      return m.offlineTicksApplied >= 1000;
    case "m_off10k":
      return m.offlineTicksApplied >= 10000;
    case "m_k500":
      return m.lifetimeTotalKills >= 500;
    case "m_comp2":
      return companionUnlockedCount(state) >= 2;
    default:
      return false;
  }
}

/**
 * Unlock any achievements whose conditions are met. Idempotent.
 * Returns new state (or same reference if nothing changed).
 */
export function applyAchievementUnlocks(state: GameState): GameState {
  let next = state;
  let changed = false;
  const unlocked = { ...state.achievementsUnlocked };
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id]) continue;
    if (achievementConditionMet(state, a.id)) {
      unlocked[a.id] = true;
      changed = true;
    }
  }
  if (changed) {
    next = { ...next, achievementsUnlocked: unlocked };
  }
  return next;
}

/** Unlock companions whose conditions are met. Idempotent. */
export function applyCompanionUnlocks(state: GameState): GameState {
  let unlocked = state.companionsUnlocked;
  let changed = false;
  for (const c of COMPANIONS) {
    if (unlocked[c.id]) continue;
    if (companionUnlockMet(state, c)) {
      if (!changed) unlocked = { ...state.companionsUnlocked };
      unlocked[c.id] = true;
      changed = true;
    }
  }
  return changed ? { ...state, companionsUnlocked: unlocked } : state;
}

export function defaultEquippedCompanion(state: GameState): import("./constants.js").CompanionId | null {
  const first = COMPANIONS.find((c) => state.companionsUnlocked[c.id]);
  return first ? first.id : null;
}

/** Boss wave by TBH-style encounter wave numbering (every 10). */
export function encounterWaveIsBoss(encounterWave: number): boolean {
  return encounterWave > 0 && encounterWave % BOSS_EVERY_N_WAVES === 0;
}

/** True when clearing this stage counts as a campaign boss clear (stage 10 of an act). */
export function stageClearIsCampaignBoss(clearedStageKey: number): boolean {
  return campaignStageIsBoss(clearedStageKey);
}

