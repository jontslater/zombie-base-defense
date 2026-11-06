/**
 * Survivor roles (TBH-style class kits) and per-role skill trees.
 * Skills have ranks; spend skill points to unlock (rank 1) or upgrade (rank 2+).
 * Cost for rank n (first unlock n=1): baseTierCost * n
 */
import type { SurvivorState } from "./types.js";

export const SURVIVOR_ROLE_IDS = [
  "brawler",
  "medic",
  "engineer",
  "hunter",
  "spotter",
  "warden",
] as const;

export type SurvivorRoleId = (typeof SURVIVOR_ROLE_IDS)[number];

export type SkillNodeDef = {
  id: SkillNodeId;
  role: SurvivorRoleId;
  /** 1 = row starter, 2–3 = deeper nodes */
  tier: number;
  /** All of these must have rank ≥ 1 before purchasing this node */
  prereqIds: SkillNodeId[];
  /** First rank costs tier * 1 (scaled); see `skillPointCostForNextRank` */
  baseTierCost: number;
  maxRank: number;
  shortName: string;
};

/** Every skill id across all roles — keep in sync with SKILL_DEFINITIONS */
export const SKILL_NODE_IDS = [
  // Brawler — frontline damage
  "bl_strike",
  "bl_heavy",
  "bl_adrenaline",
  "bl_bosshunter",
  // Medic — sustain / mitigation
  "me_patch",
  "me_mend",
  "me_barrier",
  "me_vitals",
  // Engineer — base / turret / core
  "en_turret",
  "en_generator",
  "en_coreshield",
  "en_overload",
  // Hunter — precision / focus
  "hu_precision",
  "hu_weakspot",
  "hu_volley",
  "hu_finisher",
  // Spotter — loot / economy
  "sp_loot",
  "sp_mark",
  "sp_relay",
  "sp_cache",
  // Warden — survivability
  "wa_bulwark",
  "wa_fortify",
  "wa_cover",
  "wa_corelink",
] as const;

export type SkillNodeId = (typeof SKILL_NODE_IDS)[number];

const DEFS: SkillNodeDef[] = [
  {
    id: "bl_strike",
    role: "brawler",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Strike drills",
  },
  {
    id: "bl_heavy",
    role: "brawler",
    tier: 2,
    prereqIds: ["bl_strike"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Heavy swings",
  },
  {
    id: "bl_adrenaline",
    role: "brawler",
    tier: 2,
    prereqIds: ["bl_strike"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Adrenaline",
  },
  {
    id: "bl_bosshunter",
    role: "brawler",
    tier: 3,
    prereqIds: ["bl_heavy", "bl_adrenaline"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Boss hunter",
  },
  {
    id: "me_patch",
    role: "medic",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Field patch",
  },
  {
    id: "me_mend",
    role: "medic",
    tier: 2,
    prereqIds: ["me_patch"],
    baseTierCost: 2,
    maxRank: 3,
    shortName: "Combat mend",
  },
  {
    id: "me_barrier",
    role: "medic",
    tier: 2,
    prereqIds: ["me_patch"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Barrier salve",
  },
  {
    id: "me_vitals",
    role: "medic",
    tier: 3,
    prereqIds: ["me_mend", "me_barrier"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Vitals training",
  },
  {
    id: "en_turret",
    role: "engineer",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Turret tuning",
  },
  {
    id: "en_generator",
    role: "engineer",
    tier: 2,
    prereqIds: ["en_turret"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Generator labs",
  },
  {
    id: "en_coreshield",
    role: "engineer",
    tier: 2,
    prereqIds: ["en_turret"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Core shielding",
  },
  {
    id: "en_overload",
    role: "engineer",
    tier: 3,
    prereqIds: ["en_generator", "en_coreshield"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Capacitor overload",
  },
  {
    id: "hu_precision",
    role: "hunter",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Precision",
  },
  {
    id: "hu_weakspot",
    role: "hunter",
    tier: 2,
    prereqIds: ["hu_precision"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Weakspot map",
  },
  {
    id: "hu_volley",
    role: "hunter",
    tier: 2,
    prereqIds: ["hu_precision"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Burst volley",
  },
  {
    id: "hu_finisher",
    role: "hunter",
    tier: 3,
    prereqIds: ["hu_weakspot", "hu_volley"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Boss finisher",
  },
  {
    id: "sp_loot",
    role: "spotter",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Scavenge eye",
  },
  {
    id: "sp_mark",
    role: "spotter",
    tier: 2,
    prereqIds: ["sp_loot"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Priority mark",
  },
  {
    id: "sp_relay",
    role: "spotter",
    tier: 2,
    prereqIds: ["sp_loot"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Supply relay",
  },
  {
    id: "sp_cache",
    role: "spotter",
    tier: 3,
    prereqIds: ["sp_mark", "sp_relay"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Hidden cache",
  },
  {
    id: "wa_bulwark",
    role: "warden",
    tier: 1,
    prereqIds: [],
    baseTierCost: 1,
    maxRank: 3,
    shortName: "Bulwark",
  },
  {
    id: "wa_fortify",
    role: "warden",
    tier: 2,
    prereqIds: ["wa_bulwark"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Fortify stance",
  },
  {
    id: "wa_cover",
    role: "warden",
    tier: 2,
    prereqIds: ["wa_bulwark"],
    baseTierCost: 2,
    maxRank: 2,
    shortName: "Cover drill",
  },
  {
    id: "wa_corelink",
    role: "warden",
    tier: 3,
    prereqIds: ["wa_fortify", "wa_cover"],
    baseTierCost: 3,
    maxRank: 1,
    shortName: "Core link",
  },
];

export const SKILL_DEFINITIONS: Record<SkillNodeId, SkillNodeDef> = Object.fromEntries(
  DEFS.map((d) => [d.id, d]),
) as Record<SkillNodeId, SkillNodeDef>;

export const ROLE_LABELS: Record<SurvivorRoleId, string> = {
  brawler: "Brawler",
  medic: "Medic",
  engineer: "Engineer",
  hunter: "Hunter",
  spotter: "Spotter",
  warden: "Warden",
};

export const ROLE_PASSIVES: Record<
  SurvivorRoleId,
  { name: string; desc: string }
> = {
  brawler: { name: "Hold the line", desc: "+6% outgoing damage (role passive)." },
  medic: { name: "Triage protocol", desc: "+8% idle healing between waves." },
  engineer: { name: "Field repair", desc: "+10% turret contribution." },
  hunter: { name: "Cold sights", desc: "+5% damage when target mode matches wave pressure." },
  spotter: { name: "Scrounger", desc: "+4% loot drop weight." },
  warden: { name: "Shelter doctrine", desc: "+10% max HP from role." },
};

export function skillRank(s: SurvivorState, id: SkillNodeId): number {
  const r = s.skills[id];
  return typeof r === "number" && r > 0 ? r : 0;
}

function rank(s: SurvivorState, id: SkillNodeId): number {
  return skillRank(s, id);
}

export function skillsForRole(role: SurvivorRoleId): SkillNodeDef[] {
  return DEFS.filter((d) => d.role === role);
}

/** Skill points to go from currentRank → currentRank+1 (first purchase uses currentRank 0) */
export function skillPointCostForNextRank(def: SkillNodeDef, currentRank: number): number {
  const nextRank = currentRank + 1;
  return def.baseTierCost * nextRank;
}

export function canSpendSkill(
  s: SurvivorState,
  nodeId: SkillNodeId,
): { ok: boolean; cost: number; reason?: string } {
  const def = SKILL_DEFINITIONS[nodeId];
  if (!def) return { ok: false, cost: 0, reason: "unknown" };
  if (def.role !== s.role) return { ok: false, cost: 0, reason: "wrong role" };
  const cur = skillRank(s, nodeId);
  if (cur >= def.maxRank) return { ok: false, cost: 0, reason: "max rank" };
  for (const p of def.prereqIds) {
    if (skillRank(s, p) < 1) return { ok: false, cost: 0, reason: "prereq" };
  }
  const cost = skillPointCostForNextRank(def, cur);
  if (s.skillPoints < cost) return { ok: false, cost, reason: "points" };
  return { ok: true, cost };
}

export type DamageSkillContext = {
  isBossWave: boolean;
};

/**
 * Multiplier from skill ranks + role passive (applied in combat DPS).
 */
export function survivorSkillDamageMultiplier(
  s: SurvivorState,
  ctx: DamageSkillContext,
): number {
  let m = 1;
  // Role passives (Brawler / Hunter / Spotter touch damage or loot — damage part here)
  if (s.role === "brawler") m *= 1.06;
  if (s.role === "hunter") {
    m *= 1.05;
  }

  m *= 1 + 0.02 * rank(s, "bl_strike");
  m *= 1 + 0.05 * rank(s, "bl_heavy");
  if (s.stance === "aggressive") m *= 1 + 0.03 * rank(s, "bl_adrenaline");
  if (ctx.isBossWave) m *= 1 + 0.12 * rank(s, "bl_bosshunter");

  m *= 1 + 0.02 * rank(s, "hu_precision");
  if (s.target === "weakest") m *= 1 + 0.04 * rank(s, "hu_weakspot");
  m *= 1 + 0.035 * rank(s, "hu_volley");
  if (ctx.isBossWave) m *= 1 + 0.1 * rank(s, "hu_finisher");

  m *= 1 + 0.015 * rank(s, "sp_mark");

  return m;
}

/** Extra max HP multiplier from skills + warden role */
export function survivorSkillMaxHpMultiplier(s: SurvivorState): number {
  let m = 1;
  if (s.role === "warden") m *= 1.1;
  m *= 1 + 0.03 * rank(s, "wa_bulwark");
  m *= 1 + 0.08 * rank(s, "me_vitals");
  m *= 1 + 0.02 * rank(s, "me_barrier");
  return m;
}

/** Stance damage multiplier adjusted by warden fortify */
export function survivorStanceDamageMultiplier(s: SurvivorState, base: number): number {
  if (s.role !== "warden" || s.stance !== "defensive") return base;
  return base * (1 + 0.04 * rank(s, "wa_fortify"));
}

/** Survivor inbound share multiplier (medic patch + warden cover) */
export function survivorInboundDamageMultiplier(s: SurvivorState): number {
  let m = 1;
  m *= 1 - 0.01 * rank(s, "me_patch");
  m *= 1 - 0.015 * rank(s, "wa_cover");
  return Math.max(0.5, m);
}

/** Multiplier on core inbound damage (engineer core shield + warden core link) */
export function survivorCoreInboundContribution(s: SurvivorState): number {
  const eng = 1 - 0.02 * rank(s, "en_coreshield");
  const warden = 1 - 0.03 * rank(s, "wa_corelink");
  return eng * warden;
}

/** Multiply all survivors' contributions together for core line */
export function aggregateCoreInboundMultiplier(survivors: SurvivorState[]): number {
  return survivors.reduce((acc, s) => acc * survivorCoreInboundContribution(s), 1);
}

/** Bonus to turret DPS fraction: level * 2 * (1 + bonus) from engineer tree */
export function engineerTurretSkillMultiplier(s: SurvivorState): number {
  let m = 1;
  if (s.role === "engineer") m *= 1.1;
  m *= 1 + 0.02 * rank(s, "en_turret");
  m *= 1 + 0.1 * rank(s, "en_overload");
  return m;
}

/** Generator income bonus from en_generator ranks */
export function engineerGeneratorSkillMultiplier(s: SurvivorState): number {
  return 1 + 0.06 * rank(s, "en_generator");
}

/** Extra loot drop chance from spotter skills (additive) */
export function survivorLootDropSkillBonus(s: SurvivorState): number {
  let b = 0;
  if (s.role === "spotter") b += 0.04;
  b += 0.015 * rank(s, "sp_loot");
  b += 0.01 * rank(s, "sp_cache");
  return b;
}

/** Extra currency from kills (spotter relay) */
export function survivorKillCurrencySkillBonus(s: SurvivorState): number {
  return 0.02 * rank(s, "sp_relay");
}

/** Skill point roll bonus (spotter cache) */
export function survivorSkillPointRollBonus(s: SurvivorState): number {
  return 0.01 * rank(s, "sp_cache");
}

/** Idle regen between waves: multiplier from medic mend + medic role */
export function survivorIdleRegenMultiplier(s: SurvivorState): number {
  let m = 1;
  if (s.role === "medic") m *= 1.08;
  m *= 1 + 0.1 * rank(s, "me_mend");
  return m;
}
