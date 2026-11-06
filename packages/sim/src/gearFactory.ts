import type { GemKind, GearSlot, Rarity } from "./constants.js";
import { rollGearAffixes } from "./gearModel.js";
import type { GearItem, GemItem } from "./types.js";

/** Deterministic construction for loot / forge / synthesis. */
export function makeGearItem(params: {
  id: string;
  slot: GearSlot;
  rarity: Rarity;
  power: number;
  rng: { next: () => number };
}): GearItem {
  const { id, slot, rarity, power, rng } = params;
  return {
    id,
    slot,
    rarity,
    power: Math.max(1, power),
    /** Unlocked via SOCKET_FORGE up to `maxSocketsForRarity` (new drops start closed). */
    sockets: [],
    affixes: rollGearAffixes(rng, slot, rarity),
  };
}

export function makeGemItem(params: {
  id: string;
  kind: GemKind;
  tier: number;
}): GemItem {
  return { id: params.id, kind: params.kind, tier: Math.max(1, Math.floor(params.tier)) };
}
