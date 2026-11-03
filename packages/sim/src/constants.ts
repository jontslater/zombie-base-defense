/** Simulation tick rate: 10 ticks per second of game time at 1x speed. */
export const TICKS_PER_SECOND = 10;

/** Max offline catch-up (8 hours). */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

export const SAVE_VERSION = 2;

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

export const SKILL_NODE_IDS = [
  "damage_1",
  "damage_2",
  "hp_1",
  "loot_1",
] as const;

export type SkillNodeId = (typeof SKILL_NODE_IDS)[number];

export const SKILL_COSTS: Record<SkillNodeId, number> = {
  damage_1: 1,
  damage_2: 2,
  hp_1: 1,
  loot_1: 2,
};

export const SKILL_PREREQS: Partial<Record<SkillNodeId, SkillNodeId>> = {
  damage_2: "damage_1",
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

export const RARITY_COLORS: Record<Rarity, string> = {
  Common: "#9aa5b1",
  Uncommon: "#2ecc71",
  Rare: "#3498db",
  Epic: "#9b59b6",
  Legendary: "#f1c40f",
  Mythic: "#e67e22",
  Apocalyptic: "#e74c3c",
};
