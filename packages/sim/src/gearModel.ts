import {
  AFFIX_IDS,
  GEM_KINDS,
  RARITIES,
  type AffixId,
  type GemKind,
  type Rarity,
} from "./constants.js";
import type { GemItem, GearAffix, GearItem } from "./types.js";

/**
 * Rarity → max socket slots (0–2). Rolled items get `sockets` array of that length.
 */
export function maxSocketsForRarity(rarity: Rarity): number {
  const i = RARITIES.indexOf(rarity);
  if (i < 2) return 0;
  if (i < 4) return 1;
  return 2;
}

/** How many affix lines roll on new gear at this rarity. */
export function affixCountForRarity(rarity: Rarity): number {
  const i = RARITIES.indexOf(rarity);
  if (i < 2) return 0;
  if (i < 4) return 1;
  return 2;
}

export function rollAffixValue(
  rng: { next: () => number },
  affixId: AffixId,
  rarity: Rarity,
): number {
  const tier = Math.max(0, RARITIES.indexOf(rarity));
  const roll = rng.next();
  const base =
    affixId === "sharp"
      ? 1 + Math.floor(roll * 3) + tier
      : affixId === "reinforced"
        ? 2 + Math.floor(roll * 4) + tier * 2
        : affixId === "hunter"
          ? 50 + Math.floor(roll * 100) + tier * 30
          : 1 + Math.floor(roll * 2);
  return Math.max(1, base);
}

export function pickAffixId(rng: { next: () => number }, slot: GearItem["slot"]): AffixId {
  const roll = rng.next();
  if (slot === "weapon") {
    if (roll < 0.55) return "sharp";
    if (roll < 0.85) return "hunter";
    return "salvager";
  }
  if (slot === "armor") {
    if (roll < 0.6) return "reinforced";
    if (roll < 0.9) return "hunter";
    return "salvager";
  }
  if (roll < 0.4) return "hunter";
  if (roll < 0.75) return "salvager";
  return "reinforced";
}

export function emptySocketArray(rarity: Rarity): (GemItem | null)[] {
  const n = maxSocketsForRarity(rarity);
  return Array.from({ length: n }, () => null);
}

/** Clamp socket array length to rarity cap; preserve leading gems. */
export function normalizeSocketsForRarity(
  rarity: Rarity,
  sockets: (GemItem | null)[] | undefined,
): (GemItem | null)[] {
  const max = maxSocketsForRarity(rarity);
  const s = sockets ?? [];
  const next = s.slice(0, max);
  while (next.length < max) next.push(null);
  return next;
}

export function rollGearAffixes(
  rng: { next: () => number },
  slot: GearItem["slot"],
  rarity: Rarity,
): GearAffix[] {
  const n = affixCountForRarity(rarity);
  const out: GearAffix[] = [];
  const used = new Set<AffixId>();
  for (let i = 0; i < n; i++) {
    let id = pickAffixId(rng, slot);
    let guard = 0;
    while (used.has(id) && guard < 8) {
      id = AFFIX_IDS[Math.floor(rng.next() * AFFIX_IDS.length)]!;
      guard += 1;
    }
    used.add(id);
    out.push({ id, value: rollAffixValue(rng, id, rarity) });
  }
  return out;
}

export function clampGem(g: GemItem): GemItem {
  const kind: GemKind = GEM_KINDS.includes(g.kind as GemKind) ? (g.kind as GemKind) : "ruby";
  const tier = Math.max(1, Math.min(9, Math.floor(Number(g.tier)) || 1));
  return { ...g, kind, tier };
}

/** Clamp socket length and gem records (load/migration/commands). */
export function sanitizeGearItem(it: GearItem): GearItem {
  const affixes: GearAffix[] = Array.isArray(it.affixes) ? it.affixes : [];
  const sockets = normalizeSocketsForRarity(it.rarity, it.sockets).map((g) =>
    g ? clampGem(g) : null,
  );
  return { ...it, affixes, sockets };
}
