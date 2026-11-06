import type {
  AchievementId,
  CompanionId,
} from "./constants.js";
import type { ZombieKindId } from "./zombieKinds.js";

export type Materials = Record<import("./constants.js").MaterialId, number>;

export type GemItem = {
  id: string;
  kind: import("./constants.js").GemKind;
  tier: number;
};

/** Affix line: small typed bonus (decoration analogue). */
export type GearAffix = {
  id: import("./constants.js").AffixId;
  value: number;
};

export type GearItem = {
  id: string;
  slot: import("./constants.js").GearSlot;
  rarity: import("./constants.js").Rarity;
  power: number;
  /** Socket slots; length from rarity; null = empty. */
  sockets: (GemItem | null)[];
  affixes: GearAffix[];
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

export type CompanionsUnlocked = Partial<Record<CompanionId, true>>;

export type AchievementsUnlocked = Partial<Record<AchievementId, true>>;

export type LifetimeKillsByKind = Partial<Record<ZombieKindId, number>>;

/** Lifetime counters for milestones (deterministic; no RNG). */
export type GameStateMeta = {
  /** Never decreases (used for kill milestones); distinct from per-run `totalKills`. */
  lifetimeTotalKills: number;
  lifetimeWavesCleared: number;
  lifetimeBossClears: number;
  lifetimeWorkbenchEnhances: number;
  lifetimeWorkbenchRerolls: number;
  lifetimeSalvages: number;
  lifetimeSynthesisCombines: number;
  lifetimeAlchemyForges: number;
  offlineTicksApplied: number;
};

export type WaveCombat = {
  zombiesRemaining: number;
  zombiesMax: number;
  zombieHp: number;
  zombieDamage: number;
  isBoss: boolean;
  bossHpMultiplier: number;
  /** Kills scored this encounter (for achievement wave/boss tallies). */
  killsThisWave: number;
  /** Encounter was a boss-type wave when it started. */
  wasBossWave: boolean;
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
  /**
   * Premium currency (offline raid table + future sinks). Distinct from socket `GemItem` in `gemInventory`.
   */
  gems: number;
  /** Salvage materials from breaking down gear (crafting economy). */
  materials: Materials;
  baseCoreHp: number;
  baseCoreMaxHp: number;
  upgrades: BaseUpgrades;
  survivors: SurvivorState[];
  combat: WaveCombat | null;
  inventory: GearItem[];
  /** Loose gems (combine, socketing). */
  gemInventory: GemItem[];
  totalKills: number;
  /** Directed acyclic perimeter upgrades (radio relays, fence lights, …). */
  perimeterUnlocked: PerimeterUnlocked;
  /** Times the player has Reborn (prestige stacks). */
  rebornCount: number;
  /** Lifetime currency acquired (starting grants, kills, generator, Reborn payout). */
  lifetimeCurrencyEarned: number;
  rngState: number;
  /** Per-archetype zombie kills (companions + milestones). */
  lifetimeKillsByKind: LifetimeKillsByKind;
  meta: GameStateMeta;
  companionsUnlocked: CompanionsUnlocked;
  /** Visual-only; passives apply for every unlocked companion. */
  equippedCompanionId: CompanionId | null;
  achievementsUnlocked: AchievementsUnlocked;
};

export type SaveEnvelope = {
  version: number;
  savedAtMs: number;
  state: GameState;
};
