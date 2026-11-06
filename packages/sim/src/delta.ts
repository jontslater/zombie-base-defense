import type { GameState, SurvivorState } from "./types.js";

export type GameStateDelta = {
  tick: number;
  wave: number;
  currentStageKey?: number;
  campaignHighestClearedKey?: number;
  currency?: number;
  scrap?: number;
  gems?: number;
  materials?: GameState["materials"];
  baseCoreHp?: number;
  baseCoreMaxHp?: number;
  perimeterUnlocked?: GameState["perimeterUnlocked"];
  combat?: GameState["combat"];
  inventory?: GameState["inventory"];
  gemInventory?: GameState["gemInventory"];
  survivors?: SurvivorState[];
  totalKills?: number;
  rebornCount?: number;
  lifetimeCurrencyEarned?: number;
  lifetimeKillsByKind?: GameState["lifetimeKillsByKind"];
  meta?: GameState["meta"];
  companionsUnlocked?: GameState["companionsUnlocked"];
  equippedCompanionId?: GameState["equippedCompanionId"];
  achievementsUnlocked?: GameState["achievementsUnlocked"];
};

export function diffGameState(prev: GameState, next: GameState): GameStateDelta | null {
  const delta: GameStateDelta = { tick: next.tick, wave: next.wave };
  let changed = false;

  const fields: (keyof GameStateDelta)[] = [
    "currentStageKey",
    "campaignHighestClearedKey",
    "currency",
    "scrap",
    "gems",
    "materials",
    "baseCoreHp",
    "baseCoreMaxHp",
    "totalKills",
    "rebornCount",
    "lifetimeCurrencyEarned",
    "equippedCompanionId",
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
  if (JSON.stringify(prev.lifetimeKillsByKind) !== JSON.stringify(next.lifetimeKillsByKind)) {
    delta.lifetimeKillsByKind = next.lifetimeKillsByKind;
    changed = true;
  }
  if (JSON.stringify(prev.meta) !== JSON.stringify(next.meta)) {
    delta.meta = next.meta;
    changed = true;
  }
  if (JSON.stringify(prev.companionsUnlocked) !== JSON.stringify(next.companionsUnlocked)) {
    delta.companionsUnlocked = next.companionsUnlocked;
    changed = true;
  }
  if (JSON.stringify(prev.achievementsUnlocked) !== JSON.stringify(next.achievementsUnlocked)) {
    delta.achievementsUnlocked = next.achievementsUnlocked;
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
  if (JSON.stringify(prev.gemInventory) !== JSON.stringify(next.gemInventory)) {
    delta.gemInventory = next.gemInventory;
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
    gems: delta.gems ?? state.gems,
    materials: delta.materials ?? state.materials,
    baseCoreHp: delta.baseCoreHp ?? state.baseCoreHp,
    baseCoreMaxHp: delta.baseCoreMaxHp ?? state.baseCoreMaxHp,
    perimeterUnlocked: delta.perimeterUnlocked ?? state.perimeterUnlocked,
    combat: delta.combat !== undefined ? delta.combat : state.combat,
    inventory: delta.inventory ?? state.inventory,
    gemInventory: delta.gemInventory ?? state.gemInventory,
    survivors: delta.survivors ?? state.survivors,
    totalKills: delta.totalKills ?? state.totalKills,
    rebornCount: delta.rebornCount ?? state.rebornCount,
    lifetimeCurrencyEarned: delta.lifetimeCurrencyEarned ?? state.lifetimeCurrencyEarned,
    lifetimeKillsByKind: delta.lifetimeKillsByKind ?? state.lifetimeKillsByKind,
    meta: delta.meta ?? state.meta,
    companionsUnlocked: delta.companionsUnlocked ?? state.companionsUnlocked,
    equippedCompanionId: delta.equippedCompanionId ?? state.equippedCompanionId,
    achievementsUnlocked: delta.achievementsUnlocked ?? state.achievementsUnlocked,
  };
}
