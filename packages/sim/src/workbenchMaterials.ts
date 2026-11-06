import { MATERIAL_IDS, SALVAGE_YIELDS, type MaterialId } from "./constants.js";
import type { GameState, GearItem } from "./types.js";

/** Add non-negative material deltas (clamps each key at 0). */
export function addMaterials(
  state: GameState,
  delta: Partial<Record<MaterialId, number>>,
): GameState["materials"] {
  const materials = { ...state.materials };
  for (const id of MATERIAL_IDS) {
    const d = delta[id] ?? 0;
    if (d) materials[id] = Math.max(0, materials[id] + d);
  }
  return materials;
}

export function materialsCanAfford(
  state: GameState,
  cost: Partial<Record<MaterialId, number>>,
): boolean {
  for (const id of MATERIAL_IDS) {
    const need = cost[id] ?? 0;
    if (state.materials[id] < need) return false;
  }
  return true;
}

export function subtractMaterials(
  state: GameState,
  cost: Partial<Record<MaterialId, number>>,
): GameState["materials"] {
  const materials = { ...state.materials };
  for (const id of MATERIAL_IDS) {
    materials[id] -= cost[id] ?? 0;
  }
  return materials;
}

export function salvageYieldForGear(item: GearItem): Record<MaterialId, number> {
  return { ...SALVAGE_YIELDS[item.rarity] };
}
