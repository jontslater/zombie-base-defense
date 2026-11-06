import { COMPANION_IDS, type CompanionId } from "./constants.js";
import type { GameState } from "./types.js";
import type { ZombieKindId } from "./zombieKinds.js";

export type CompanionDef = {
  id: CompanionId;
  name: string;
  blurb: string;
  /** Sprite frame key in `sprites` atlas (strip/panel). */
  spriteKey: string;
  /** Kill threshold for this zombie kind (ignored when unlockKind is null). */
  unlockKind: ZombieKindId | null;
  unlockKills: number;
  /** Passive bonuses from this companion when unlocked (multipliers add as fractional bonuses). */
  passive: {
    /** Added to core inbound mitigation multiplier chain (see perimeter). */
    coreMitigationAdd: number;
    /** Added to kill/generator currency multiplier. */
    currencyMultAdd: number;
    /** Added to survivor+turret DPS multiplier. */
    dpsMultAdd: number;
    /** Added to loot drop chance (before cap). */
    lootDropChanceAdd: number;
    /** Flat scrap per zombie kill. */
    scrapPerKill: number;
    /** Multiplier on idle survivor regen (1 + sum of these). */
    regenMultAdd: number;
  };
};

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: "alarms_dog",
    name: "Alarms Dog",
    blurb: "Barks before the horde crests the ditch.",
    spriteKey: "companion_dog",
    unlockKind: "shambler",
    unlockKills: 40,
    passive: { coreMitigationAdd: 0.02, currencyMultAdd: 0, dpsMultAdd: 0, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "drone_scout",
    name: "Drone Scout",
    blurb: "Maps heat signatures beyond the fence line.",
    spriteKey: "companion_drone",
    unlockKind: "boss",
    unlockKills: 2,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0.03, dpsMultAdd: 0, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "stash_mutt",
    name: "Stash Mutt",
    blurb: "Brings scrap back in its muzzle basket.",
    spriteKey: "companion_mutt",
    unlockKind: "crowd",
    unlockKills: 50,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0, dpsMultAdd: 0, lootDropChanceAdd: 0, scrapPerKill: 1, regenMultAdd: 0 },
  },
  {
    id: "relay_crow",
    name: "Relay Crow",
    blurb: "Drops verified loot coords on repeaters.",
    spriteKey: "companion_crow",
    unlockKind: "spitter",
    unlockKills: 25,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0, dpsMultAdd: 0, lootDropChanceAdd: 0.02, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "runner_cat",
    name: "Runner Cat",
    blurb: "Pounces outliers; teaches stance tempo.",
    spriteKey: "companion_cat",
    unlockKind: "runner",
    unlockKills: 35,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0, dpsMultAdd: 0.02, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "barricade_badger",
    name: "Barricade Badger",
    blurb: "Digs scrap berms under the wall.",
    spriteKey: "companion_badger",
    unlockKind: "brute",
    unlockKills: 20,
    passive: { coreMitigationAdd: 0.015, currencyMultAdd: 0, dpsMultAdd: 0.01, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "convoy_parrot",
    name: "Convoy Parrot",
    blurb: "Mimics supply-net handshakes for offline sync.",
    spriteKey: "companion_parrot",
    unlockKind: null,
    unlockKills: 0,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0, dpsMultAdd: 0, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0 },
  },
  {
    id: "memorial_raven",
    name: "Memorial Raven",
    blurb: "Circles the convoy after every Reborn — never forgets.",
    spriteKey: "companion_raven",
    unlockKind: null,
    unlockKills: 0,
    passive: { coreMitigationAdd: 0, currencyMultAdd: 0, dpsMultAdd: 0, lootDropChanceAdd: 0, scrapPerKill: 0, regenMultAdd: 0.03 },
  },
] as const;

const byId: Record<CompanionId, CompanionDef> = {} as Record<CompanionId, CompanionDef>;
for (const c of COMPANIONS) {
  byId[c.id] = c;
}

export function companionDef(id: CompanionId): CompanionDef | undefined {
  return byId[id];
}

function killsOfKind(state: GameState, kind: ZombieKindId): number {
  return state.lifetimeKillsByKind[kind] ?? 0;
}

export function companionUnlockMet(state: GameState, c: CompanionDef): boolean {
  if (c.unlockKind !== null) {
    return killsOfKind(state, c.unlockKind) >= c.unlockKills;
  }
  if (c.id === "convoy_parrot") {
    return (state.meta.offlineTicksApplied ?? 0) >= 5000;
  }
  if (c.id === "memorial_raven") {
    return state.rebornCount >= 1;
  }
  return false;
}

/** Sum passives for every unlocked companion (equip is cosmetic only). */
export function companionPassiveTotals(state: GameState): CompanionDef["passive"] {
  let coreMitigationAdd = 0;
  let currencyMultAdd = 0;
  let dpsMultAdd = 0;
  let lootDropChanceAdd = 0;
  let scrapPerKill = 0;
  let regenMultAdd = 0;
  for (const id of COMPANION_IDS) {
    if (!state.companionsUnlocked[id]) continue;
    const def = byId[id];
    if (!def) continue;
    coreMitigationAdd += def.passive.coreMitigationAdd;
    currencyMultAdd += def.passive.currencyMultAdd;
    dpsMultAdd += def.passive.dpsMultAdd;
    lootDropChanceAdd += def.passive.lootDropChanceAdd;
    scrapPerKill += def.passive.scrapPerKill;
    regenMultAdd += def.passive.regenMultAdd;
  }
  return {
    coreMitigationAdd,
    currencyMultAdd,
    dpsMultAdd,
    lootDropChanceAdd,
    scrapPerKill,
    regenMultAdd,
  };
}

export function companionCoreMitigationMult(state: GameState): number {
  return 1 + companionPassiveTotals(state).coreMitigationAdd;
}

export function companionCurrencyIncomeMult(state: GameState): number {
  return 1 + companionPassiveTotals(state).currencyMultAdd;
}

export function companionDpsMult(state: GameState): number {
  return 1 + companionPassiveTotals(state).dpsMultAdd;
}

export function companionLootDropChanceAdd(state: GameState): number {
  return companionPassiveTotals(state).lootDropChanceAdd;
}

export function companionScrapPerKill(state: GameState): number {
  return companionPassiveTotals(state).scrapPerKill;
}

export function companionRegenMult(state: GameState): number {
  return 1 + companionPassiveTotals(state).regenMultAdd;
}
