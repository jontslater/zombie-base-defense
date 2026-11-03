import { BASE_UPGRADE_IDS, SAVE_VERSION } from "./constants.js";
import type { GameState, SaveEnvelope } from "./types.js";

export function createInitialState(seed = 12345): GameState {
  return {
    tick: 0,
    wave: 1,
    currency: 50,
    scrap: 0,
    baseCoreHp: 200,
    baseCoreMaxHp: 200,
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

function migrateSave(env: SaveEnvelope): void {
  if (env.version < SAVE_VERSION) {
    env.version = SAVE_VERSION;
  }
  for (const id of BASE_UPGRADE_IDS) {
    if (env.state.upgrades[id] === undefined) env.state.upgrades[id] = 0;
  }
  for (const s of env.state.survivors) {
    if (!s.stance) s.stance = "aggressive";
    if (!s.target) s.target = "nearest";
    if (s.controllerId === undefined) s.controllerId = null;
    if (s.aiControlUntilTick === undefined) s.aiControlUntilTick = null;
  }
}

export function saveToJson(state: GameState, savedAtMs: number): string {
  return JSON.stringify(serializeSave(state, savedAtMs));
}

export function loadFromJson(json: string): { state: GameState; savedAtMs: number } {
  const env = parseSave(json);
  return { state: env.state, savedAtMs: env.savedAtMs };
}
