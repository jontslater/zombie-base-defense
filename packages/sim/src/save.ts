import {
  BASE_UPGRADE_IDS,
  INITIAL_CURRENCY,
  MATERIAL_IDS,
  SAVE_VERSION,
} from "./constants.js";
import {
  CAMPAIGN_LAST_STAGE_KEY,
  campaignWaveNumberFromStageKey,
  stageKeyFromCampaignWave,
} from "./campaign.js";
import { normalizeGameState } from "./normalize.js";
import type { GameState, SaveEnvelope } from "./types.js";
import {
  SURVIVOR_ROLE_IDS,
  SKILL_NODE_IDS,
  type SkillNodeId,
  type SurvivorRoleId,
} from "./survivorRoles.js";

function emptyMaterials(): GameState["materials"] {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as GameState["materials"];
}

export function createInitialState(seed = 12345): GameState {
  return {
    tick: 0,
    wave: 1,
    currentStageKey: 0,
    campaignHighestClearedKey: -1,
    currency: INITIAL_CURRENCY,
    scrap: 0,
    materials: emptyMaterials(),
    baseCoreHp: 200,
    baseCoreMaxHp: 200,
    perimeterUnlocked: {},
    upgrades: {
      wall: 0,
      turret: 0,
      generator: 0,
      workbench: 0,
    },
    survivors: [
      {
        id: "surv-1",
        name: "Scout",
        role: "hunter",
        hp: 80,
        maxHp: 80,
        damage: 12,
        skillPoints: 0,
        skills: {},
        gear: {},
        stance: "aggressive",
        target: "nearest",
        controllerId: null,
        aiControlUntilTick: null,
      },
      {
        id: "surv-2",
        name: "Engineer",
        role: "engineer",
        hp: 70,
        maxHp: 70,
        damage: 8,
        skillPoints: 0,
        skills: {},
        gear: {},
        stance: "aggressive",
        target: "nearest",
        controllerId: null,
        aiControlUntilTick: null,
      },
    ],
    combat: null,
    inventory: [],
    totalKills: 0,
    rebornCount: 0,
    lifetimeCurrencyEarned: INITIAL_CURRENCY,
    rngState: seed >>> 0,
  };
}

export function serializeSave(state: GameState, savedAtMs: number): SaveEnvelope {
  return {
    version: SAVE_VERSION,
    savedAtMs,
    state: structuredClone(state),
  };
}

export function parseSave(json: string): SaveEnvelope {
  const data = JSON.parse(json) as SaveEnvelope;
  if (typeof data.version !== "number" || !data.state) {
    throw new Error("invalid save");
  }
  migrateSave(data);
  return data;
}

function setSkillRank(skills: GameState["survivors"][0]["skills"], id: SkillNodeId, rank: number): void {
  const prev = skills[id];
  const p = typeof prev === "number" ? prev : 0;
  skills[id] = Math.max(p, rank);
}

function tier1SkillForRole(role: SurvivorRoleId): SkillNodeId {
  switch (role) {
    case "brawler":
      return "bl_strike";
    case "medic":
      return "me_patch";
    case "engineer":
      return "en_turret";
    case "hunter":
      return "hu_precision";
    case "spotter":
      return "sp_loot";
    case "warden":
      return "wa_bulwark";
  }
}

function tier2DamageSkillForRole(role: SurvivorRoleId): SkillNodeId {
  switch (role) {
    case "brawler":
      return "bl_heavy";
    case "medic":
      return "me_mend";
    case "engineer":
      return "en_generator";
    case "hunter":
      return "hu_weakspot";
    case "spotter":
      return "sp_mark";
    case "warden":
      return "wa_fortify";
  }
}

function migrateSurvivorsToRoles(state: GameState): void {
  state.survivors.forEach((s, index) => {
    if (!SURVIVOR_ROLE_IDS.includes(s.role as SurvivorRoleId)) {
      s.role = SURVIVOR_ROLE_IDS[index % SURVIVOR_ROLE_IDS.length]!;
    }
    const role = s.role as SurvivorRoleId;
    const skills = { ...s.skills } as Record<string, unknown>;
    const out: GameState["survivors"][0]["skills"] = {};

    const takeRank = (id: SkillNodeId, rank: number): void => {
      if (SKILL_NODE_IDS.includes(id)) setSkillRank(out, id, rank);
    };

    for (const [k, v] of Object.entries(skills)) {
      if (SKILL_NODE_IDS.includes(k as SkillNodeId)) {
        const r = typeof v === "number" ? v : v === true ? 1 : 0;
        if (r > 0) takeRank(k as SkillNodeId, r);
      }
    }

    const hadBool = (key: string): boolean => skills[key] === true;

    if (hadBool("damage_1")) {
      takeRank(tier1SkillForRole(role), 1);
    }
    if (hadBool("damage_2")) {
      takeRank(tier1SkillForRole(role), 1);
      takeRank(tier2DamageSkillForRole(role), 1);
    }
    if (hadBool("hp_1")) {
      takeRank(role === "medic" ? "me_barrier" : "wa_bulwark", 1);
    }
    if (hadBool("loot_1")) {
      takeRank("sp_loot", 1);
    }

    s.skills = out;
  });
}

/**
 * Chained migrations: capture `prevVersion` before bumping so steps keyed to older envelope versions
 * (e.g. campaign grid at v5) still run. Structural coercion for partial JSON is v6+.
 * v8: survivor roles + per-role ranked skill trees (replaces flat boolean lattice).
 */
function migrateSave(env: SaveEnvelope): void {
  const prevVersion = env.version;
  if (env.version < SAVE_VERSION) {
    env.version = SAVE_VERSION;
  }

  if (prevVersion < 6) {
    env.state = normalizeGameState(env.state);
  }

  if (prevVersion < 8) {
    migrateSurvivorsToRoles(env.state);
  }

  if (!env.state.materials) {
    env.state.materials = emptyMaterials();
  } else {
    for (const id of MATERIAL_IDS) {
      if (env.state.materials[id] === undefined) env.state.materials[id] = 0;
    }
  }
  for (const id of BASE_UPGRADE_IDS) {
    if (env.state.upgrades[id] === undefined) env.state.upgrades[id] = 0;
  }
  if (env.state.rebornCount === undefined) env.state.rebornCount = 0;
  if (env.state.lifetimeCurrencyEarned === undefined) {
    env.state.lifetimeCurrencyEarned = INITIAL_CURRENCY;
  }
  if (!env.state.perimeterUnlocked) env.state.perimeterUnlocked = {};
  for (const s of env.state.survivors) {
    if (!s.stance) s.stance = "aggressive";
    if (!s.target) s.target = "nearest";
    if (s.controllerId === undefined) s.controllerId = null;
    if (s.aiControlUntilTick === undefined) s.aiControlUntilTick = null;
    if (!s.role || !SURVIVOR_ROLE_IDS.includes(s.role as SurvivorRoleId)) {
      const idx = env.state.survivors.indexOf(s);
      s.role = SURVIVOR_ROLE_IDS[idx % SURVIVOR_ROLE_IDS.length]!;
    }
  }

  // Campaign grid (SAVE_VERSION 5+ on envelope): clamp legacy infinite ladder into 1–120 encounter waves.
  if (prevVersion < 5) {
    const w = env.state.wave;
    const clampedWave = Math.max(1, Math.min(CAMPAIGN_LAST_STAGE_KEY + 1, w));
    env.state.wave = clampedWave;
    if (env.state.currentStageKey === undefined) {
      env.state.currentStageKey = stageKeyFromCampaignWave(clampedWave);
    }
    if (env.state.campaignHighestClearedKey === undefined) {
      env.state.campaignHighestClearedKey =
        clampedWave >= 2 ? stageKeyFromCampaignWave(clampedWave - 1) : -1;
    }
  }
  if (env.state.currentStageKey === undefined) {
    env.state.currentStageKey = stageKeyFromCampaignWave(
      Math.min(env.state.wave, CAMPAIGN_LAST_STAGE_KEY + 1),
    );
  }
  if (env.state.campaignHighestClearedKey === undefined) {
    env.state.campaignHighestClearedKey = -1;
  }
  env.state.currentStageKey = Math.max(
    0,
    Math.min(CAMPAIGN_LAST_STAGE_KEY, env.state.currentStageKey),
  );
  env.state.campaignHighestClearedKey = Math.max(
    -1,
    Math.min(CAMPAIGN_LAST_STAGE_KEY, env.state.campaignHighestClearedKey),
  );

  const wClamped = Math.max(1, Math.min(CAMPAIGN_LAST_STAGE_KEY + 1, env.state.wave));
  env.state.wave = wClamped;
  const waveFromKey = campaignWaveNumberFromStageKey(env.state.currentStageKey);
  if (waveFromKey !== wClamped) {
    env.state.currentStageKey = stageKeyFromCampaignWave(wClamped);
  }
  env.state.wave = campaignWaveNumberFromStageKey(env.state.currentStageKey);
}

export function saveToJson(state: GameState, savedAtMs: number): string {
  return JSON.stringify(serializeSave(state, savedAtMs));
}

export function loadFromJson(json: string): { state: GameState; savedAtMs: number } {
  const env = parseSave(json);
  return { state: env.state, savedAtMs: env.savedAtMs };
}
