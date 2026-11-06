import { sanitizeGearItem } from "./gearModel.js";
import type { GearAffix, GearItem } from "./types.js";

/** Minimal valid `GearItem` for tests (migration fills sockets/affixes). */
export function testGear(
  p: Pick<GearItem, "id" | "slot" | "rarity" | "power"> & {
    sockets?: GearItem["sockets"];
    affixes?: GearAffix[];
  },
): GearItem {
  return sanitizeGearItem({
    ...p,
    sockets: p.sockets ?? [],
    affixes: p.affixes ?? [],
  });
}
