import {
  AFFIX_IDS,
  BASE_UPGRADE_IDS,
  GEAR_SLOTS,
  GEM_KINDS,
  INITIAL_CURRENCY,
  MATERIAL_IDS,
  PERIMETER_NODE_IDS,
  RARITIES,
  STANCES,
  TARGET_MODES,
  type BaseUpgradeId,
  type AffixId,
  type GearSlot,
  type GemKind,
  type MaterialId,
  type PerimeterNodeId,
  type Rarity,
  type Stance,
  type TargetMode,
} from "./constants.js";
import { CAMPAIGN_LAST_STAGE_KEY, stageKeyFromCampaignWave } from "./campaign.js";
import { sanitizeGearItem } from "./gearModel.js";
import { SKILL_NODE_IDS, SURVIVOR_ROLE_IDS, type SurvivorRoleId } from "./survivorRoles.js";
import type {
  GearAffix,
  GearItem,
  GemItem,
  GameState,
  Materials,
  PerimeterUnlocked,
  SurvivorState,
  WaveCombat,
} from "./types.js";

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function isGearSlot(s: string): s is GearSlot {
  return (GEAR_SLOTS as readonly string[]).includes(s);
}

function isRarity(s: string): s is Rarity {
  return (RARITIES as readonly string[]).includes(s);
}

function isAffixId(s: string): s is AffixId {
  return (AFFIX_IDS as readonly string[]).includes(s);
}

function isGemKind(s: string): s is GemKind {
  return (GEM_KINDS as readonly string[]).includes(s);
}

function asGemItem(raw: unknown): GemItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id, "gem-unknown");
  const kind = o.kind;
  const tier = num(o.tier, 1);
  if (typeof kind !== "string" || !isGemKind(kind)) return null;
  return { id, kind, tier: Math.max(1, Math.floor(tier)) };
}

function asGearAffixes(raw: unknown): GearAffix[] {
  if (!Array.isArray(raw)) return [];
  const out: GearAffix[] = [];
  for (const line of raw) {
    if (!line || typeof line !== "object") continue;
    const o = line as Record<string, unknown>;
    const id = o.id;
    if (typeof id !== "string" || !isAffixId(id)) continue;
    out.push({ id, value: Math.max(1, Math.floor(num(o.value, 1))) });
  }
  return out;
}

function asSockets(raw: unknown): (GemItem | null)[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((cell) => {
    if (cell === null || cell === undefined) return null;
    return asGemItem(cell);
  });
}

function asGearItem(raw: unknown): GearItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slot = o.slot;
  const rarity = o.rarity;
  if (typeof slot !== "string" || typeof rarity !== "string") return null;
  if (!isGearSlot(slot) || !isRarity(rarity)) return null;
  const id = str(o.id, "unknown");
  const power = num(o.power, 1);
  const draft: GearItem = {
    id,
    slot,
    rarity,
    power: Math.max(1, power),
    sockets: asSockets(o.sockets),
    affixes: asGearAffixes(o.affixes),
  };
  return sanitizeGearItem(draft);
}

function normalizeGearMap(raw: unknown): Partial<Record<GearSlot, GearItem>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<GearSlot, GearItem>> = {};
  for (const slot of GEAR_SLOTS) {
    const it = (raw as Record<string, unknown>)[slot];
    const g = asGearItem(it);
    if (g && g.slot === slot) out[slot] = g;
  }
  return out;
}

function defaultRoleForSurvivorId(id: string): SurvivorRoleId {
  if (id === "surv-1") return "hunter";
  if (id === "surv-2") return "engineer";
  return "brawler";
}

function isSurvivorRole(s: string): s is SurvivorRoleId {
  return (SURVIVOR_ROLE_IDS as readonly string[]).includes(s);
}

/** Preserves per-node ranks; forwards legacy boolean lattice keys for migrateSave v8. */
function normalizeSkills(raw: unknown): SurvivorState["skills"] {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const out: SurvivorState["skills"] = {};
  for (const key of ["damage_1", "damage_2", "hp_1", "loot_1"] as const) {
    if (o[key] === true) out[key] = true;
  }
  for (const id of SKILL_NODE_IDS) {
    const v = o[id];
    if (typeof v === "number" && Number.isFinite(v) && v >= 1) {
      out[id] = Math.max(1, Math.floor(v));
    }
    if (v === true) out[id] = 1;
  }
  return out;
}

function normalizeStance(raw: unknown): Stance {
  return STANCES.includes(raw as Stance) ? (raw as Stance) : "aggressive";
}

function normalizeTarget(raw: unknown): TargetMode {
  return TARGET_MODES.includes(raw as TargetMode) ? (raw as TargetMode) : "nearest";
}

function emptyMaterials(): Materials {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Materials;
}

function normalizeMaterials(raw: unknown): Materials {
  const out = emptyMaterials();
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const id of MATERIAL_IDS) {
    const idTyped = id as MaterialId;
    const v = o[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[idTyped] = Math.max(0, Math.floor(v));
    }
  }
  return out;
}

function normalizePerimeterUnlocked(raw: unknown): PerimeterUnlocked {
  const out: PerimeterUnlocked = {};
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const id of PERIMETER_NODE_IDS) {
    if (o[id] === true) out[id as PerimeterNodeId] = true;
  }
  return out;
}

export function normalizeSurvivor(raw: unknown, fallbackId: string): SurvivorState {
  if (!raw || typeof raw !== "object") {
    return {
      id: fallbackId,
      name: "Survivor",
      role: defaultRoleForSurvivorId(fallbackId),
      hp: 80,
      maxHp: 80,
      damage: 10,
      skillPoints: 0,
      skills: {},
      gear: {},
      stance: "aggressive",
      target: "nearest",
      controllerId: null,
      aiControlUntilTick: null,
    };
  }
  const o = raw as Record<string, unknown>;
  const id = str(o.id, fallbackId);
  const maxHp = Math.max(1, num(o.maxHp, 80));
  const hp = Math.min(Math.max(0, num(o.hp, maxHp)), maxHp);
  const controllerId =
    o.controllerId === null || o.controllerId === undefined
      ? null
      : typeof o.controllerId === "string"
        ? o.controllerId
        : null;
  const aiRaw = o.aiControlUntilTick;
  const aiControlUntilTick =
    aiRaw === null || aiRaw === undefined
      ? null
      : typeof aiRaw === "number" && Number.isFinite(aiRaw)
        ? aiRaw
        : null;

  const roleRaw = o.role;
  const role: SurvivorRoleId =
    typeof roleRaw === "string" && isSurvivorRole(roleRaw) ? roleRaw : defaultRoleForSurvivorId(id);

  return {
    id,
    name: str(o.name, "Survivor").slice(0, 24),
    role,
    hp,
    maxHp,
    damage: Math.max(1, num(o.damage, 10)),
    skillPoints: Math.max(0, Math.floor(num(o.skillPoints, 0))),
    skills: normalizeSkills(o.skills),
    gear: normalizeGearMap(o.gear),
    stance: normalizeStance(o.stance),
    target: normalizeTarget(o.target),
    controllerId,
    aiControlUntilTick,
  };
}

export function normalizeCombat(raw: unknown): WaveCombat | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const zombiesMax = Math.max(1, Math.floor(num(o.zombiesMax, 1)));
  const zombiesRemaining = Math.max(0, Math.floor(num(o.zombiesRemaining, zombiesMax)));
  return {
    zombiesRemaining,
    zombiesMax,
    zombieHp: Math.max(1, num(o.zombieHp, 25)),
    zombieDamage: Math.max(0, num(o.zombieDamage, 4)),
    isBoss: Boolean(o.isBoss),
    bossHpMultiplier: Math.max(1, num(o.bossHpMultiplier, 1)),
  };
}

/** Ensures a parsed save body matches `GameState` invariants after migrations. */
export function normalizeGameState(raw: unknown): GameState {
  if (!raw || typeof raw !== "object") {
    throw new Error("invalid save state");
  }
  const o = raw as Record<string, unknown>;

  const upgrades: GameState["upgrades"] = {
    wall: 0,
    turret: 0,
    generator: 0,
    workbench: 0,
  };
  const upRaw = o.upgrades;
  if (upRaw && typeof upRaw === "object") {
    for (const id of BASE_UPGRADE_IDS) {
      const idTyped = id as BaseUpgradeId;
      upgrades[idTyped] = Math.max(0, Math.floor(num((upRaw as Record<string, unknown>)[id], 0)));
    }
  }

  const survivorsList: unknown[] = Array.isArray(o.survivors) ? o.survivors : [];
  const survivors =
    survivorsList.length > 0
      ? survivorsList.map((s: unknown, i: number) => normalizeSurvivor(s, `surv-${i + 1}`))
      : [normalizeSurvivor(null, "surv-1"), normalizeSurvivor(null, "surv-2")];

  const inventoryList: unknown[] = Array.isArray(o.inventory) ? o.inventory : [];
  const inventory: GearItem[] = inventoryList.map(asGearItem).filter((x): x is GearItem => x !== null);

  const gemList: unknown[] = Array.isArray(o.gemInventory) ? o.gemInventory : [];
  const gemInventory: GemItem[] = gemList.map(asGemItem).filter((x): x is GemItem => x !== null);

  const baseCoreMaxHp = Math.max(1, num(o.baseCoreMaxHp, 200));
  const baseCoreHp = Math.min(Math.max(0, num(o.baseCoreHp, baseCoreMaxHp)), baseCoreMaxHp);

  const rebornCount = Math.max(0, Math.floor(num(o.rebornCount, 0)));
  const lifetimeCurrencyEarned = Math.max(0, Math.floor(num(o.lifetimeCurrencyEarned, INITIAL_CURRENCY)));

  const waveN = Math.max(1, Math.floor(num(o.wave, 1)));
  const ckRaw = o.currentStageKey;
  const currentStageKey =
    typeof ckRaw === "number" && Number.isFinite(ckRaw)
      ? Math.max(0, Math.min(CAMPAIGN_LAST_STAGE_KEY, Math.floor(ckRaw)))
      : stageKeyFromCampaignWave(waveN);
  const hkRaw = o.campaignHighestClearedKey;
  const campaignHighestClearedKey =
    typeof hkRaw === "number" && Number.isFinite(hkRaw)
      ? Math.max(-1, Math.min(CAMPAIGN_LAST_STAGE_KEY, Math.floor(hkRaw)))
      : -1;

  const perimeterUnlocked = normalizePerimeterUnlocked(o.perimeterUnlocked);

  return {
    tick: Math.max(0, Math.floor(num(o.tick, 0))),
    wave: waveN,
    currentStageKey,
    campaignHighestClearedKey,
    currency: Math.max(0, Math.floor(num(o.currency, 0))),
    scrap: Math.max(0, Math.floor(num(o.scrap, 0))),
    gems: Math.max(0, Math.floor(num(o.gems, 0))),
    materials: normalizeMaterials(o.materials),
    baseCoreHp,
    baseCoreMaxHp,
    upgrades,
    survivors,
    combat: normalizeCombat(o.combat),
    inventory,
    gemInventory,
    totalKills: Math.max(0, Math.floor(num(o.totalKills, 0))),
    perimeterUnlocked,
    rebornCount,
    lifetimeCurrencyEarned,
    rngState: num(o.rngState, 1) >>> 0,
  };
}
