/** Simulation tick rate: 10 ticks per second of game time at 1x speed. */
export const TICKS_PER_SECOND = 10;

/** Max offline catch-up (8 hours). */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;

export const SAVE_VERSION = 1;

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
