export type GearItem = {
  id: string;
  slot: import("./constants.js").GearSlot;
  rarity: import("./constants.js").Rarity;
  power: number;
};

export type SurvivorState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  skillPoints: number;
  skills: Partial<Record<import("./constants.js").SkillNodeId, true>>;
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
  wave: number;
  currency: number;
  scrap: number;
  baseCoreHp: number;
  baseCoreMaxHp: number;
  upgrades: BaseUpgrades;
  survivors: SurvivorState[];
  combat: WaveCombat | null;
  inventory: GearItem[];
  totalKills: number;
  rngState: number;
};

export type SaveEnvelope = {
  version: number;
  savedAtMs: number;
  state: GameState;
};
