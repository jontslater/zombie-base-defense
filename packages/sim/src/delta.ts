import type { GameState, SurvivorState } from "./types.js";

export type GameStateDelta = {
  tick: number;
  wave: number;
  currency?: number;
  scrap?: number;
  baseCoreHp?: number;
  baseCoreMaxHp?: number;
  combat?: GameState["combat"];
  inventory?: GameState["inventory"];
  survivors?: SurvivorState[];
  totalKills?: number;
};

export function diffGameState(prev: GameState, next: GameState): GameStateDelta | null {
  const delta: GameStateDelta = { tick: next.tick, wave: next.wave };
  let changed = false;

  const fields: (keyof GameStateDelta)[] = [
    "currency",
    "scrap",
    "baseCoreHp",
    "baseCoreMaxHp",
    "totalKills",
  ];
  for (const key of fields) {
    if (prev[key as keyof GameState] !== next[key as keyof GameState]) {
      (delta as Record<string, unknown>)[key] = next[key as keyof GameState];
      changed = true;
    }
  }

  if (JSON.stringify(prev.combat) !== JSON.stringify(next.combat)) {
    delta.combat = next.combat;
    changed = true;
  }
  if (JSON.stringify(prev.inventory) !== JSON.stringify(next.inventory)) {
    delta.inventory = next.inventory;
    changed = true;
  }
  if (JSON.stringify(prev.survivors) !== JSON.stringify(next.survivors)) {
    delta.survivors = next.survivors;
    changed = true;
  }

  if (!changed && prev.tick === next.tick && prev.wave === next.wave) return null;
  return delta;
}

export function applyGameStateDelta(state: GameState, delta: GameStateDelta): GameState {
  return {
    ...state,
    tick: delta.tick,
    wave: delta.wave,
    currency: delta.currency ?? state.currency,
    scrap: delta.scrap ?? state.scrap,
    baseCoreHp: delta.baseCoreHp ?? state.baseCoreHp,
    baseCoreMaxHp: delta.baseCoreMaxHp ?? state.baseCoreMaxHp,
    combat: delta.combat !== undefined ? delta.combat : state.combat,
    inventory: delta.inventory ?? state.inventory,
    survivors: delta.survivors ?? state.survivors,
    totalKills: delta.totalKills ?? state.totalKills,
  };
}
