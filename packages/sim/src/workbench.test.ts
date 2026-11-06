import { describe, expect, it } from "vitest";
import {
  ALCHEMY_FORGE_CURRENCY,
  ALCHEMY_FORGE_MATERIALS,
  ALCHEMY_FORGE_SCRAP,
  MATERIAL_IDS,
  RARITIES,
  SYNTHESIS_INPUT_COUNT,
  SYNTHESIS_SCRAP_COST,
} from "./constants.js";
import { stageKeyFromCampaignWave } from "./campaign.js";
import { applyCommand, createInitialState, loadFromJson, saveToJson } from "./index.js";
import type { GameCommand } from "./commands.js";
import { diffGameState, applyGameStateDelta } from "./delta.js";
import { salvageYieldForGear } from "./workbenchMaterials.js";

function withEncounterWave(state: ReturnType<typeof createInitialState>, wave: number) {
  const w = Math.max(1, Math.min(120, wave));
  return { ...state, wave: w, currentStageKey: stageKeyFromCampaignWave(w) };
}

function baseCmd(): { id: string; playerId: string; issuedAtTick: number } {
  return { id: "test", playerId: "p", issuedAtTick: 0 };
}

function withWorkbench(seed: number, scrap = 50, currency = 500) {
  let state = createInitialState(seed);
  state = applyCommand(state, {
    ...baseCmd(),
    type: "UPGRADE_BASE",
    upgradeId: "workbench",
  } as GameCommand);
  state = { ...state, scrap: state.scrap + scrap, currency: state.currency + currency };
  return state;
}

describe("Salvage (inventory → materials)", () => {
  it("grants materials and removes the item", () => {
    let state = withWorkbench(101);
    state = {
      ...state,
      inventory: [{ id: "loot-a", slot: "weapon", rarity: "Common", power: 10 }],
    };
    const yieldMap = salvageYieldForGear(state.inventory[0]!);
    const beforeMat = state.materials.alloy;
    state = applyCommand(state, { ...baseCmd(), type: "SALVAGE_GEAR", inventoryIndex: 0 } as GameCommand);
    expect(state.inventory).toHaveLength(0);
    expect(state.materials.alloy).toBe(beforeMat + (yieldMap.alloy ?? 0));
  });

  it("no-ops without workbench", () => {
    let state = createInitialState(102);
    state = {
      ...state,
      inventory: [{ id: "loot-b", slot: "armor", rarity: "Rare", power: 5 }],
    };
    const snapshot = JSON.stringify(state);
    state = applyCommand(state, { ...baseCmd(), type: "SALVAGE_GEAR", inventoryIndex: 0 } as GameCommand);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("Synthesis (9 same rarity → next tier)", () => {
  it("consumes 9 items, scrap, and adds one item of higher rarity", () => {
    let state = withWorkbench(201, SYNTHESIS_SCRAP_COST + 5);
    const baseWave = 6;
    state = withEncounterWave(state, baseWave);
    const items = Array.from({ length: SYNTHESIS_INPUT_COUNT }, (_, i) => ({
      id: `c-${i}`,
      slot: "weapon" as const,
      rarity: "Common" as const,
      power: 5,
    }));
    state = { ...state, inventory: items };
    const beforeScrap = state.scrap;
    const indices = items.map((_, i) => i);
    state = applyCommand(
      state,
      { ...baseCmd(), type: "SYNTHESIS_COMBINE", inventoryIndices: indices } as GameCommand,
    );
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]?.rarity).toBe("Uncommon");
    expect(state.scrap).toBe(beforeScrap - SYNTHESIS_SCRAP_COST);
  });

  it("rejects mixed rarities or duplicate indices", () => {
    let state = withWorkbench(202, 100);
    const mixed = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `m-${i}`,
        slot: "weapon" as const,
        rarity: "Common" as const,
        power: 1,
      })),
      { id: "m-x", slot: "weapon" as const, rarity: "Uncommon" as const, power: 1 },
    ];
    state = { ...state, inventory: mixed };
    const bad = applyCommand(
      state,
      {
        ...baseCmd(),
        type: "SYNTHESIS_COMBINE",
        inventoryIndices: mixed.map((_, i) => i),
      } as GameCommand,
    );
    expect(bad.inventory).toHaveLength(9);

    const same = Array.from({ length: SYNTHESIS_INPUT_COUNT }, (_, i) => ({
      id: `s-${i}`,
      slot: "weapon" as const,
      rarity: "Common" as const,
      power: 1,
    }));
    state = { ...state, inventory: same };
    const dupIdx = applyCommand(
      state,
      {
        ...baseCmd(),
        type: "SYNTHESIS_COMBINE",
        inventoryIndices: [0, 0, 1, 2, 3, 4, 5, 6, 7],
      } as GameCommand,
    );
    expect(dupIdx.inventory).toHaveLength(9);
  });

  it("rejects if apex rarity (no next tier)", () => {
    let state = withWorkbench(203, SYNTHESIS_SCRAP_COST + 2);
    const apex = RARITIES[RARITIES.length - 1]!;
    const items = Array.from({ length: SYNTHESIS_INPUT_COUNT }, (_, i) => ({
      id: `a-${i}`,
      slot: "weapon" as const,
      rarity: apex,
      power: 50,
    }));
    state = { ...state, inventory: items };
    const after = applyCommand(
      state,
      {
        ...baseCmd(),
        type: "SYNTHESIS_COMBINE",
        inventoryIndices: items.map((_, i) => i),
      } as GameCommand,
    );
    expect(after.inventory).toHaveLength(9);
  });
});

describe("Alchemy forge (material + currency sink)", () => {
  it("spends scrap, currency, materials, and appends one item", () => {
    let state = withWorkbench(301, ALCHEMY_FORGE_SCRAP + 5, ALCHEMY_FORGE_CURRENCY + 20);
    const mats = { ...state.materials };
    for (const id of MATERIAL_IDS) {
      mats[id] += ALCHEMY_FORGE_MATERIALS[id] ?? 0;
    }
    state = withEncounterWave({ ...state, materials: mats }, 5);
    const beforeInv = state.inventory.length;
    const beforeCur = state.currency;
    state = applyCommand(state, { ...baseCmd(), type: "ALCHEMY_FORGE", slot: "armor" } as GameCommand);
    expect(state.inventory.length).toBe(beforeInv + 1);
    expect(state.inventory[state.inventory.length - 1]?.slot).toBe("armor");
    expect(state.currency).toBe(beforeCur - ALCHEMY_FORGE_CURRENCY);
    expect(state.materials).toEqual(createInitialState(1).materials);
  });

  it("no-ops when materials are short", () => {
    let state = withWorkbench(302, 100, 500);
    state = { ...state, materials: createInitialState(1).materials };
    const snap = JSON.stringify(state);
    state = applyCommand(state, { ...baseCmd(), type: "ALCHEMY_FORGE", slot: "weapon" } as GameCommand);
    expect(JSON.stringify(state)).toBe(snap);
  });
});

describe("Save / delta materials", () => {
  it("round-trips materials through JSON save", () => {
    let state = createInitialState(401);
    state = { ...state, materials: { ...state.materials, alloy: 7, battery: 3 } };
    const json = saveToJson(state, Date.now());
    const loaded = loadFromJson(json);
    expect(loaded.state.materials.alloy).toBe(7);
    expect(loaded.state.materials.battery).toBe(3);
  });

  it("includes materials in co-op delta", () => {
    let prev = createInitialState(402);
    let next = { ...prev, materials: { ...prev.materials, alloy: prev.materials.alloy + 2 } };
    const d = diffGameState(prev, next);
    expect(d?.materials?.alloy).toBe(next.materials.alloy);
    const merged = applyGameStateDelta(prev, d!);
    expect(merged.materials.alloy).toBe(next.materials.alloy);
  });
});
