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

/**
 * Chained migrations: capture `prevVersion` before bumping so steps keyed to older schema numbers
 * (e.g. campaign grid at envelope v5) still run. Structural coercion for partial JSON is v6+.
 */
function migrateSave(env: SaveEnvelope): void {
  const prevVersion = env.version;
  if (env.version < SAVE_VERSION) {
    env.version = SAVE_VERSION;
  }

  if (prevVersion < 6) {
    env.state = normalizeGameState(env.state);
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
