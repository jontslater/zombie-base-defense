import type { GameState, SurvivorState } from "./types.js";

export type GameStateDelta = {
  tick: number;
  wave: number;
  currentStageKey?: number;
  campaignHighestClearedKey?: number;
  currency?: number;
  scrap?: number;
  materials?: GameState["materials"];
  baseCoreHp?: number;
  baseCoreMaxHp?: number;
  perimeterUnlocked?: GameState["perimeterUnlocked"];
  combat?: GameState["combat"];
  inventory?: GameState["inventory"];
  survivors?: SurvivorState[];
  totalKills?: number;
  rebornCount?: number;
  lifetimeCurrencyEarned?: number;
};

export function diffGameState(prev: GameState, next: GameState): GameStateDelta | null {
  const delta: GameStateDelta = { tick: next.tick, wave: next.wave };
  let changed = false;

  const fields: (keyof GameStateDelta)[] = [
    "currentStageKey",
    "campaignHighestClearedKey",
    "currency",
    "scrap",
    "materials",
    "baseCoreHp",
    "baseCoreMaxHp",
    "totalKills",
    "rebornCount",
    "lifetimeCurrencyEarned",
  ];
  for (const key of fields) {
    const pk = key as keyof GameState;
    const prevVal = prev[pk];
    const nextVal = next[pk];
    const differs =
      key === "materials"
        ? JSON.stringify(prevVal) !== JSON.stringify(nextVal)
        : prevVal !== nextVal;
    if (differs) {
      (delta as Record<string, unknown>)[key] = nextVal;
      changed = true;
    }
  }

  if (JSON.stringify(prev.perimeterUnlocked) !== JSON.stringify(next.perimeterUnlocked)) {
    delta.perimeterUnlocked = next.perimeterUnlocked;
    changed = true;
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
    currentStageKey: delta.currentStageKey ?? state.currentStageKey,
    campaignHighestClearedKey:
      delta.campaignHighestClearedKey ?? state.campaignHighestClearedKey,
    currency: delta.currency ?? state.currency,
    scrap: delta.scrap ?? state.scrap,
    materials: delta.materials ?? state.materials,
    baseCoreHp: delta.baseCoreHp ?? state.baseCoreHp,
    baseCoreMaxHp: delta.baseCoreMaxHp ?? state.baseCoreMaxHp,
    perimeterUnlocked: delta.perimeterUnlocked ?? state.perimeterUnlocked,
    combat: delta.combat !== undefined ? delta.combat : state.combat,
    inventory: delta.inventory ?? state.inventory,
    survivors: delta.survivors ?? state.survivors,
    totalKills: delta.totalKills ?? state.totalKills,
    rebornCount: delta.rebornCount ?? state.rebornCount,
    lifetimeCurrencyEarned: delta.lifetimeCurrencyEarned ?? state.lifetimeCurrencyEarned,
  };
}
