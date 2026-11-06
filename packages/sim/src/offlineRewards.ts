import { coordsFromStageKey, campaignWaveNumberFromStageKey, shortCampaignLabel } from "./campaign.js";
import {
  MATERIAL_IDS,
  OFFLINE_ABSENCE_MAX_MS,
  OFFLINE_CAP_BASE_MS,
  OFFLINE_CAP_BONUS_MS_PER_UNLOCKED_NODE,
  rebornIncomeMultiplier,
  type MaterialId,
} from "./constants.js";
import { sanitizeGearItem } from "./gearModel.js";
import { perimeterUnlockedCount } from "./perimeter.js";
import { mulberry32, pickWeighted } from "./rng.js";
import { rollLoot } from "./waves.js";
import type { GameState, GearItem, Materials } from "./types.js";

export type OfflineRaidRewards = {
  currency: number;
  scrap: number;
  materials: Materials;
  gems: number;
  loot: GearItem[];
};

export type OfflineRaidReport = {
  /** Accrual window used for rewards after anti-tamper caps (≤ cap). */
  accrualMs: number;
  /** Max accrual for this save (base 8h + perimeter bonus). */
  accrualCapMs: number;
  /** Raw clock delta (clamped for display; may exceed cap). */
  timeAwayMs: number;
  /** Human-readable sector from highest cleared stage + tier. */
  sectorLabel: string;
  rewards: OfflineRaidRewards;
};

function emptyMaterials(): Materials {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Materials;
}

function addMaterials(a: Materials, b: Partial<Materials>): Materials {
  const out = { ...a };
  for (const id of MATERIAL_IDS) {
    out[id] = out[id] + Math.max(0, Math.floor(b[id] ?? 0));
  }
  return out;
}

/** Highest encounter difficulty reached from campaign progression (−1 → treat as wave 1, tier 0). */
export function offlineBenchmarkWave(state: GameState): number {
  const hk = state.campaignHighestClearedKey;
  if (hk < 0) return 1;
  return campaignWaveNumberFromStageKey(hk);
}

export function offlineBenchmarkTier(state: GameState): number {
  const hk = state.campaignHighestClearedKey;
  if (hk < 0) return 0;
  return coordsFromStageKey(hk).tier;
}

/**
 * Base 8h cap + 30 minutes per unlocked perimeter node (relay grid “repose” extenders).
 */
export function computeOfflineAccrualCapMs(state: GameState): number {
  const n = perimeterUnlockedCount(state);
  return Math.min(
    OFFLINE_ABSENCE_MAX_MS,
    OFFLINE_CAP_BASE_MS + n * OFFLINE_CAP_BONUS_MS_PER_UNLOCKED_NODE,
  );
}

/**
 * Effective away time for rewards: forward-only, absence max, accrual cap.
 * Clock going backward → 0 (anti–clock-skew).
 */
export function computeOfflineAccrualMs(
  savedAtMs: number,
  nowMs: number,
  state: GameState,
): { accrualMs: number; timeAwayMs: number; capMs: number } {
  const capMs = computeOfflineAccrualCapMs(state);
  if (!Number.isFinite(savedAtMs) || !Number.isFinite(nowMs)) {
    return { accrualMs: 0, timeAwayMs: 0, capMs };
  }
  const raw = Math.max(0, nowMs - savedAtMs);
  const awayClamped = Math.min(raw, OFFLINE_ABSENCE_MAX_MS);
  const accrual = Math.min(capMs, awayClamped);
  return { accrualMs: accrual, timeAwayMs: awayClamped, capMs };
}

/**
 * TBH-style per-minute reward table (deterministic; scales with highest cleared sector + tier).
 */
export function computeOfflineRaidRewards(
  state: GameState,
  accrualMs: number,
): { rewards: OfflineRaidRewards; rngStateAfterLoot: number } {
  if (accrualMs <= 0) {
    return {
      rewards: { currency: 0, scrap: 0, materials: emptyMaterials(), gems: 0, loot: [] },
      rngStateAfterLoot: state.rngState,
    };
  }

  const encounterWave = offlineBenchmarkWave(state);
  const tier = offlineBenchmarkTier(state);
  /** Difficulty multiplier: +25% rewards per campaign tier (Normal→Hell). */
  const scaleNumerator = 100 + tier * 25;
  const scaleEncounter = Math.max(1, Math.floor((encounterWave * scaleNumerator) / 100));

  const minutes = Math.max(1, Math.floor(accrualMs / 60_000));

  const incomeMult = rebornIncomeMultiplier(state.rebornCount);
  const currencyPerMin = 1 + Math.floor(scaleEncounter / 20);
  const scrapPerMin = Math.max(0, Math.floor(scaleEncounter / 45));

  const currency = Math.floor(minutes * currencyPerMin * incomeMult);
  const scrap = Math.floor(minutes * scrapPerMin * incomeMult);

  const matBudget = minutes * (1 + Math.floor(scaleEncounter / 30));
  const materials = allocateMaterialsDeterministic(state.rngState, matBudget, scaleEncounter);

  /** Rare premium currency: scales with tier and encounter — rolled from integer shards. */
  const gemShards = minutes * (tier + 1) * (10 + Math.floor(scaleEncounter / 40));
  let gems = Math.floor(gemShards / 60);

  const loot: GearItem[] = [];
  const maxLootRolls = 80;
  const lootRolls = Math.min(maxLootRolls, Math.max(0, Math.floor(minutes / 2)));
  let s = { ...state, tick: state.tick };
  for (let i = 0; i < lootRolls; i++) {
    s = { ...s, tick: s.tick + i + 1 };
    const { state: next, item } = rollLoot(s);
    s = next;
    if (item) loot.push(sanitizeGearItem(item));
  }
  const rngStateAfterLoot = s.rngState;

  const bonusRng = mulberry32((state.rngState ^ 0xa57e0f11) >>> 0);
  const bonusRolls = Math.min(5, Math.floor(minutes / 45));
  for (let b = 0; b < bonusRolls; b++) {
    if (bonusRng.next() < Math.min(0.35, 0.08 + tier * 0.04)) {
      gems += 1;
    }
  }

  return {
    rewards: {
      currency,
      scrap,
      materials,
      gems,
      loot,
    },
    rngStateAfterLoot,
  };
}

function allocateMaterialsDeterministic(
  seed: number,
  budget: number,
  scaleEncounter: number,
): Materials {
  const out = emptyMaterials();
  if (budget <= 0) return out;

  const weights: Record<MaterialId, number> = {
    alloy: 5,
    battery: 4,
    compound: 3,
    fiber: 3,
    wiring: 3,
  };
  let remaining = budget;
  const rng = mulberry32((seed ^ 0xba5e6470) >>> 0);
  let guard = 0;
  while (remaining > 0 && guard < 10_000) {
    guard += 1;
    const id = pickWeighted(rng, weights);
    const chunk = Math.min(
      remaining,
      1 + Math.floor(rng.next() * (2 + Math.floor(scaleEncounter / 50))),
    );
    out[id] = out[id] + chunk;
    remaining -= chunk;
  }
  return out;
}

function mergeLootIntoInventory(state: GameState, items: GearItem[]): GameState {
  if (items.length === 0) return state;
  return {
    ...state,
    inventory: [...state.inventory, ...items.map(sanitizeGearItem)],
  };
}

export function applyOfflineRaidRewards(state: GameState, rewards: OfflineRaidRewards): GameState {
  let next: GameState = {
    ...state,
    currency: state.currency + rewards.currency,
    scrap: state.scrap + rewards.scrap,
    materials: addMaterials(state.materials, rewards.materials),
    gems: state.gems + rewards.gems,
    lifetimeCurrencyEarned: state.lifetimeCurrencyEarned + rewards.currency,
  };
  next = mergeLootIntoInventory(next, rewards.loot);
  return next;
}

export function buildOfflineRaidReport(
  state: GameState,
  savedAtMs: number,
  nowMs: number,
): { state: GameState; report: OfflineRaidReport | null } {
  const { accrualMs, timeAwayMs, capMs } = computeOfflineAccrualMs(savedAtMs, nowMs, state);
  if (accrualMs <= 0) {
    return { state, report: null };
  }

  const { rewards, rngStateAfterLoot } = computeOfflineRaidRewards(state, accrualMs);
  const sectorKey = state.campaignHighestClearedKey >= 0 ? state.campaignHighestClearedKey : 0;
  const sectorLabel = shortCampaignLabel(sectorKey);

  const rewarded = applyOfflineRaidRewards(state, rewards);

  const rngStep =
    mulberry32((rngStateAfterLoot ^ rewards.currency ^ rewards.scrap ^ rewards.gems ^ rewards.loot.length) >>> 0)
      .state >>> 0;

  const finalState: GameState = { ...rewarded, rngState: rngStep };

  return {
    state: finalState,
    report: {
      accrualMs,
      accrualCapMs: capMs,
      timeAwayMs,
      sectorLabel,
      rewards,
    },
  };
}
