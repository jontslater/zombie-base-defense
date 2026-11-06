import { campaignWaveNumberFromStageKey } from "./campaign.js";
import {
  MATERIAL_IDS,
  PERIMETER_NODE_IDS,
  type MaterialId,
  type PerimeterNodeId,
} from "./constants.js";
import type { GameState } from "./types.js";

/**
 * Directed acyclic unlock grid — radio relays, fence lights, trap caps.
 * Data-driven: add nodes here; effects are pure multipliers / unlock flags.
 */
export { PERIMETER_NODE_IDS, type PerimeterNodeId };

export type PerimeterCost =
  | { kind: "currency"; amount: number }
  | { kind: "scrap"; amount: number }
  | { kind: "materials"; materials: Partial<Record<MaterialId, number>> };

export type PerimeterNodeDef = {
  id: PerimeterNodeId;
  name: string;
  flavor: string;
  /** Parent on the DAG; omit for roots. */
  requires?: PerimeterNodeId;
  /** Minimum encounter difficulty wave 1–120 (`campaignWaveNumberFromStageKey(currentStageKey)`). */
  minWave?: number;
  /** Lifetime kills milestone. */
  minTotalKills?: number;
  costs: PerimeterCost[];
  /** Multiplier applied to kill + generator currency (stacks multiplicatively with Reborn). */
  currencyIncomeMult?: number;
  /** Extra flat chance on top of base loot roll (capped in rollLoot). */
  lootDropChanceAdd?: number;
  /** Shift rarity weights toward higher tiers (multiplicative on non-Common buckets). */
  rarityBandShiftMult?: number;
  /** Reduces damage to base core from zombies (multiplicative mitigation). */
  coreMitigationMult?: number;
  /** Survivor + turret DPS multiplier. */
  survivorDpsMult?: number;
  /** When set, second Alchemy forge recipe unlocks (same cost table, different slot emphasis). */
  unlockSecondForgeRecipe?: boolean;
  /**
   * Trap network cadence: effective divisor for auto-spawn waves in simTick.
   * Higher = less frequent ambient waves when idle.
   */
  trapFrequencyDivisorAdd?: number;
};

export const PERIMETER_GRID: readonly PerimeterNodeDef[] = [
  {
    id: "relay_alpha",
    name: "Relay Alpha",
    flavor: "First hop for perimeter comms; tightens supply payouts.",
    minWave: 3,
    costs: [{ kind: "currency", amount: 40 }],
    currencyIncomeMult: 1.06,
  },
  {
    id: "fence_lamps_row2",
    name: "Fence Lamps — Row 2",
    flavor: "Floodline along the second palisade; drops stay visible longer.",
    requires: "relay_alpha",
    minTotalKills: 15,
    costs: [
      { kind: "scrap", amount: 12 },
      { kind: "currency", amount: 20 },
    ],
    lootDropChanceAdd: 0.04,
  },
  {
    id: "trap_scheduler_tune",
    name: "Trap Scheduler Tune",
    flavor: "Spreads tripwire firings so swarms don't bunch on the gate timer.",
    requires: "fence_lamps_row2",
    minWave: 8,
    costs: [{ kind: "currency", amount: 55 }, { kind: "scrap", amount: 18 }],
    trapFrequencyDivisorAdd: 2,
  },
  {
    id: "mesh_band_extender",
    name: "Mesh Band Extender",
    flavor: "Pushes salvage bands up-band without widening the floor.",
    requires: "relay_alpha",
    costs: [
      { kind: "currency", amount: 35 },
      { kind: "materials", materials: { alloy: 1, wiring: 1 } },
    ],
    rarityBandShiftMult: 1.12,
  },
  {
    id: "second_bench_line",
    name: "Aux Bench Line",
    flavor: "Second forge crucible line — duplicate alchemy throughput.",
    requires: "mesh_band_extender",
    minWave: 12,
    costs: [
      { kind: "scrap", amount: 30 },
      { kind: "materials", materials: { compound: 2, battery: 1 } },
    ],
    unlockSecondForgeRecipe: true,
  },
] as const;

const NODE_MAP: ReadonlyMap<PerimeterNodeId, PerimeterNodeDef> = new Map(
  PERIMETER_GRID.map((n) => [n.id, n]),
);

function encounterWave(state: GameState): number {
  return campaignWaveNumberFromStageKey(state.currentStageKey);
}

export function perimeterNodeDef(id: PerimeterNodeId): PerimeterNodeDef | undefined {
  return NODE_MAP.get(id);
}

export function isPerimeterNodeUnlocked(state: GameState, id: PerimeterNodeId): boolean {
  return Boolean(state.perimeterUnlocked[id]);
}

function foldMult<T extends keyof PerimeterNodeDef>(
  state: GameState,
  key: T,
  neutral: number,
  combine: (acc: number, v: number) => number,
): number {
  let acc = neutral;
  for (const id of PERIMETER_NODE_IDS) {
    if (!state.perimeterUnlocked[id]) continue;
    const def = NODE_MAP.get(id);
    const v = def?.[key];
    if (typeof v === "number") acc = combine(acc, v);
  }
  return acc;
}

/** Product of all `currencyIncomeMult` from unlocked nodes (default 1). */
export function perimeterCurrencyIncomeMult(state: GameState): number {
  return foldMult(state, "currencyIncomeMult", 1, (a, b) => a * b);
}

/** Sum of `lootDropChanceAdd` from unlocked nodes. */
export function perimeterLootDropChanceAdd(state: GameState): number {
  return foldMult(state, "lootDropChanceAdd", 0, (a, b) => a + b);
}

/** Product of `rarityBandShiftMult` (default 1). */
export function perimeterRarityBandShiftMult(state: GameState): number {
  return foldMult(state, "rarityBandShiftMult", 1, (a, b) => a * b);
}

/** Product of core mitigation multipliers (default 1). */
export function perimeterCoreMitigationMult(state: GameState): number {
  return foldMult(state, "coreMitigationMult", 1, (a, b) => a * b);
}

/** Product of survivor DPS multipliers (default 1). */
export function perimeterSurvivorDpsMult(state: GameState): number {
  return foldMult(state, "survivorDpsMult", 1, (a, b) => a * b);
}

export function perimeterTrapFrequencyDivisorBonus(state: GameState): number {
  return foldMult(state, "trapFrequencyDivisorAdd", 0, (a, b) => a + b);
}

export function perimeterSecondForgeUnlocked(state: GameState): boolean {
  for (const id of PERIMETER_NODE_IDS) {
    if (!state.perimeterUnlocked[id]) continue;
    if (NODE_MAP.get(id)?.unlockSecondForgeRecipe) return true;
  }
  return false;
}

export function perimeterUnlockedCount(state: GameState): number {
  return PERIMETER_NODE_IDS.filter((id) => state.perimeterUnlocked[id]).length;
}

function canAffordCost(state: GameState, cost: PerimeterCost): boolean {
  if (cost.kind === "currency") return state.currency >= cost.amount;
  if (cost.kind === "scrap") return state.scrap >= cost.amount;
  for (const id of MATERIAL_IDS) {
    const need = cost.materials[id] ?? 0;
    if ((state.materials[id] ?? 0) < need) return false;
  }
  return true;
}

function subtractCost(state: GameState, cost: PerimeterCost): GameState {
  if (cost.kind === "currency") {
    return { ...state, currency: state.currency - cost.amount };
  }
  if (cost.kind === "scrap") {
    return { ...state, scrap: state.scrap - cost.amount };
  }
  const materials = { ...state.materials };
  for (const id of MATERIAL_IDS) {
    const need = cost.materials[id] ?? 0;
    if (need > 0) materials[id] = (materials[id] ?? 0) - need;
  }
  return { ...state, materials };
}

export type PerimeterBuyReject =
  | "unknown_node"
  | "already_unlocked"
  | "prereq"
  | "milestone_wave"
  | "milestone_kills"
  | "cannot_afford";

export function tryBuyPerimeterNode(
  state: GameState,
  nodeId: PerimeterNodeId,
): { ok: true; state: GameState } | { ok: false; reason: PerimeterBuyReject } {
  const def = NODE_MAP.get(nodeId);
  if (!def) return { ok: false, reason: "unknown_node" };
  if (isPerimeterNodeUnlocked(state, nodeId)) return { ok: false, reason: "already_unlocked" };
  if (def.requires && !isPerimeterNodeUnlocked(state, def.requires)) {
    return { ok: false, reason: "prereq" };
  }
  if (def.minWave !== undefined && encounterWave(state) < def.minWave) {
    return { ok: false, reason: "milestone_wave" };
  }
  if (def.minTotalKills !== undefined && state.totalKills < def.minTotalKills) {
    return { ok: false, reason: "milestone_kills" };
  }
  for (const c of def.costs) {
    if (!canAffordCost(state, c)) return { ok: false, reason: "cannot_afford" };
  }

  let next = state;
  for (const c of def.costs) {
    next = subtractCost(next, c);
  }
  next = {
    ...next,
    perimeterUnlocked: { ...next.perimeterUnlocked, [nodeId]: true },
  };
  return { ok: true, state: next };
}
