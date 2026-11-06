export type Materials = Record<import("./constants.js").MaterialId, number>;

export type GearItem = {
  id: string;
  slot: import("./constants.js").GearSlot;
  rarity: import("./constants.js").Rarity;
  power: number;
};

export type SurvivorState = {
  id: string;
  name: string;
  /** Class kit — gates which skill tree nodes can be purchased. */
  role: import("./survivorRoles.js").SurvivorRoleId;
  hp: number;
  maxHp: number;
  damage: number;
  skillPoints: number;
  /**
   * Per-node rank (≥1). Omitted = 0.
   * Legacy v4–v7 keys (`damage_1`, … booleans) are stripped at SAVE_VERSION 8 migration.
   */
  skills: Partial<
    Record<import("./survivorRoles.js").SkillNodeId | "damage_1" | "damage_2" | "hp_1" | "loot_1", number | true>
  >;
  gear: Partial<Record<import("./constants.js").GearSlot, GearItem>>;
  stance: import("./constants.js").Stance;
  target: import("./constants.js").TargetMode;
  /** Relay client id when a human controls this survivor; null = host/local AI. */
  controllerId: string | null;
  /** Sim tick until AI control after guest disconnect; null when not in grace. */
  aiControlUntilTick: number | null;
};

export type BaseUpgrades = Record<
  import("./constants.js").BaseUpgradeId,
  number
>;

export type PerimeterUnlocked = Partial<
  Record<import("./constants.js").PerimeterNodeId, true>
>;

export type WaveCombat = {
  zombiesRemaining: number;
  zombiesMax: number;
  zombieHp: number;
  zombieDamage: number;
  isBoss: boolean;
  bossHpMultiplier: number;
};

export type GameState = {
  tick: number;
  /**
   * Difficulty wave 1–120 for this encounter (mirrors TBH-style campaign linear index + 1).
   * Prefer `currentStageKey` for act/stage UI; this stays aligned for scaling and legacy tests.
   */
  wave: number;
  /**
   * Linear campaign stage 0–119 (4 tiers × 3 acts × 10 stages). Select/farm via panel command.
   */
  currentStageKey: number;
  /**
   * Highest linear stage cleared (−1 = none). Used for unlock/farm rules.
   */
  campaignHighestClearedKey: number;
  currency: number;
  scrap: number;
  /** Salvage materials from breaking down gear (crafting economy). */
  materials: Materials;
  baseCoreHp: number;
  baseCoreMaxHp: number;
  upgrades: BaseUpgrades;
  survivors: SurvivorState[];
  combat: WaveCombat | null;
  inventory: GearItem[];
  totalKills: number;
  /** Directed acyclic perimeter upgrades (radio relays, fence lights, …). */
  perimeterUnlocked: PerimeterUnlocked;
  /** Times the player has Reborn (prestige stacks). */
  rebornCount: number;
  /** Lifetime currency acquired (starting grants, kills, generator, Reborn payout). */
  lifetimeCurrencyEarned: number;
  rngState: number;
};

export type SaveEnvelope = {
  version: number;
  savedAtMs: number;
  state: GameState;
};
