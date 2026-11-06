/**
 * Balance knobs (wave scaling, Reborn prestige).
 *
 * Wave difficulty grows with `WAVE_HP_DAMAGE_SCALE_PER_WAVE` in `buildWaveCombat`.
 * Kill/generator currency uses `REBORN_INCOME_MULT_PER_STACK` (stacks with `rebornCount`).
 * Survivor+turret DPS uses `REBORN_DPS_MULT_PER_STACK`. Reborn resets the run but keeps
 * `rebornCount` and grants `INITIAL_CURRENCY + rebornPayout(wave)`.
 */
export const INITIAL_CURRENCY = 50;

/** Exponential-ish curve for upgrade prices: floor(25 * 1.55^level). */
export const UPGRADE_COST_BASE = 25;
export const UPGRADE_COST_GROWTH = 1.55;

/** Zombie HP and damage scale as 1 + (wave - 1) * this. */
export const WAVE_HP_DAMAGE_SCALE_PER_WAVE = 0.12;

/** Reborn requires this minimum wave (idle / not in combat). */
export const REBORN_MIN_WAVE = 5;

/** Currency granted by Reborn on top of `INITIAL_CURRENCY`. */
export const REBORN_BONUS_CURRENCY_FLAT = 25;
/** `floor(wave * this)` added to Reborn payout (wave = level when Reborn triggers). */
export const REBORN_BONUS_CURRENCY_PER_WAVE = 3;

/** Kill + generator currency multiplied by `1 + rebornCount * this`. */
export const REBORN_INCOME_MULT_PER_STACK = 0.08;

/** Total DPS multiplier: `1 + rebornCount * this` (survivors + turret bonus). */
export const REBORN_DPS_MULT_PER_STACK = 0.05;

/** Simulation tick rate: 10 ticks per second of game time at 1x speed. */
export const TICKS_PER_SECOND = 10;

/** Max offline catch-up (8 hours) — default accrual cap; extended via perimeter grid. */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

/** Base offline reward accrual cap (same as `OFFLINE_CAP_MS`). */
export const OFFLINE_CAP_BASE_MS = OFFLINE_CAP_MS;

/** Each unlocked perimeter node extends offline accrual by this many milliseconds (30 min). */
export const OFFLINE_CAP_BONUS_MS_PER_UNLOCKED_NODE = 30 * 60 * 1000;

/**
 * Ignore absence beyond this wall clock span for rewards (anti backdated tamper).
 * ~30 days — matches TBH community “long absence zeros” pattern at a soft bound.
 */
export const OFFLINE_ABSENCE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

/** v4: materials; v5: campaign; v6: normalizeGameState; v7: perimeter; v8: survivor roles + ranked skills; v9: gear sockets/gem bag/affixes; v10: offline raid rewards + gems wallet. */
export const SAVE_VERSION = 10;

export const BOSS_EVERY_N_WAVES = 10;

export const WAVE_PENALTY_ON_CORE_FALL = 5;

export const BASE_UPGRADE_IDS = [
  "wall",
  "turret",
  "generator",
  "workbench",
] as const;

export type BaseUpgradeId = (typeof BASE_UPGRADE_IDS)[number];

export const GEAR_SLOTS = [
  "weapon",
  "armor",
  "tool",
  "trinket",
] as const;

export type GearSlot = (typeof GEAR_SLOTS)[number];

export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
  "Apocalyptic",
] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  Common: 5000,
  Uncommon: 2500,
  Rare: 1200,
  Epic: 600,
  Legendary: 400,
  Mythic: 250,
  Apocalyptic: 50,
};

export const STANCES = ["aggressive", "defensive", "support"] as const;
export type Stance = (typeof STANCES)[number];

export const TARGET_MODES = ["nearest", "boss", "weakest"] as const;
export type TargetMode = (typeof TARGET_MODES)[number];

/** Co-op guest spawns on the next 5s boundary (sim ticks). */
export const COOP_JOIN_INTERVAL_TICKS = 5 * TICKS_PER_SECOND;

/** After disconnect, AI controls the survivor for 60s of sim time. */
export const COOP_AI_GRACE_TICKS = 60 * TICKS_PER_SECOND;

export const WORKBENCH_ENHANCE_SCRAP = 3;
export const WORKBENCH_REROLL_SCRAP = 5;
export const WORKBENCH_REROLL_CURRENCY = 10;

/** Material types from breaking down gear (TBH-style alchemy subset). */
export const MATERIAL_IDS = ["alloy", "battery", "compound", "fiber", "wiring"] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];

/**
 * Perimeter grid node ids (DAG meta progression — radio relays, fence lights, trap caps).
 * Definitions live in `perimeter.ts`.
 */
export const PERIMETER_NODE_IDS = [
  "relay_alpha",
  "fence_lamps_row2",
  "trap_scheduler_tune",
  "mesh_band_extender",
  "second_bench_line",
] as const;

export type PerimeterNodeId = (typeof PERIMETER_NODE_IDS)[number];

/** How many duplicate items of one rarity fuse into the next tier. */
export const SYNTHESIS_INPUT_COUNT = 9;

/** Scrap consumed per crucible combine (sink). */
export const SYNTHESIS_SCRAP_COST = 2;

/**
 * Each material granted when salvaging one item of this rarity.
 * Totals scale ~linearly with tier to avoid exponential salvage loops.
 */
export const SALVAGE_YIELDS: Record<Rarity, Record<MaterialId, number>> = {
  Common: { alloy: 1, battery: 0, compound: 0, fiber: 0, wiring: 0 },
  Uncommon: { alloy: 1, battery: 1, compound: 0, fiber: 0, wiring: 0 },
  Rare: { alloy: 2, battery: 1, compound: 0, fiber: 1, wiring: 0 },
  Epic: { alloy: 2, battery: 1, compound: 1, fiber: 1, wiring: 0 },
  Legendary: { alloy: 3, battery: 2, compound: 1, fiber: 1, wiring: 1 },
  Mythic: { alloy: 3, battery: 2, compound: 2, fiber: 2, wiring: 1 },
  Apocalyptic: { alloy: 4, battery: 3, compound: 3, fiber: 2, wiring: 2 },
};

/** Alchemy forge: targeted roll for one slot (material + currency sink). */
export const ALCHEMY_FORGE_SCRAP = 6;
export const ALCHEMY_FORGE_CURRENCY = 15;
export const ALCHEMY_FORGE_MATERIALS: Record<MaterialId, number> = {
  alloy: 2,
  battery: 1,
  compound: 1,
  fiber: 0,
  wiring: 1,
};

/** Socket gems: combine three of same kind+tier → one tier+1. */
export const GEM_KINDS = ["ruby", "sapphire", "topaz"] as const;
export type GemKind = (typeof GEM_KINDS)[number];

export const GEM_COMBINE_INPUT_COUNT = 3;

/** Boss kills: extra chance to roll a tier-1 gem into `gemInventory`. */
export const GEM_DROP_CHANCE_BOSS = 0.12;

/** Scrap + mats to add one empty socket to gear (max 2 sockets). */
export const SOCKET_FORGE_SCRAP = 4;
export const SOCKET_FORGE_MATERIALS: Record<MaterialId, number> = {
  alloy: 1,
  battery: 0,
  compound: 1,
  fiber: 1,
  wiring: 0,
};

/** Small typed modifiers on high-rarity gear. */
export const AFFIX_IDS = ["sharp", "reinforced", "hunter", "salvager"] as const;
export type AffixId = (typeof AFFIX_IDS)[number];

export const RARITY_COLORS: Record<Rarity, string> = {
  Common: "#9aa5b1",
  Uncommon: "#2ecc71",
  Rare: "#3498db",
  Epic: "#9b59b6",
  Legendary: "#f1c40f",
  Mythic: "#e67e22",
  Apocalyptic: "#e74c3c",
};

export function upgradeCostAtLevel(level: number): number {
  return Math.floor(UPGRADE_COST_BASE * Math.pow(UPGRADE_COST_GROWTH, level));
}

/** Currency granted when Reborn triggers at `wave` (full payout replaces wallet). */
export function rebornStartingCurrency(wave: number): number {
  return (
    INITIAL_CURRENCY +
    REBORN_BONUS_CURRENCY_FLAT +
    Math.floor(wave * REBORN_BONUS_CURRENCY_PER_WAVE)
  );
}

export function rebornIncomeMultiplier(rebornStacks: number): number {
  return 1 + rebornStacks * REBORN_INCOME_MULT_PER_STACK;
}

export function rebornDpsMultiplier(rebornStacks: number): number {
  return 1 + rebornStacks * REBORN_DPS_MULT_PER_STACK;
}
