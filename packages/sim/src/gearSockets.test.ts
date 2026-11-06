import { describe, expect, it } from "vitest";
import {
  GEM_COMBINE_INPUT_COUNT,
  SOCKET_FORGE_MATERIALS,
  SOCKET_FORGE_SCRAP,
} from "./constants.js";
import { stageKeyFromCampaignWave } from "./campaign.js";
import { applyCommand, createInitialState, loadFromJson, saveToJson } from "./index.js";
import type { GameCommand } from "./commands.js";
import { materialsCanAfford } from "./workbenchMaterials.js";
import { makeGemItem } from "./gearFactory.js";
import { sanitizeGearItem } from "./gearModel.js";
import { testGear } from "./testGear.js";

function baseCmd(): Pick<GameCommand, "id" | "playerId" | "issuedAtTick"> {
  return { id: "t", playerId: "p", issuedAtTick: 0 };
}

function withBench(seed: number) {
  let s = createInitialState(seed);
  s = applyCommand(s, { ...baseCmd(), type: "UPGRADE_BASE", upgradeId: "workbench" } as GameCommand);
  return s;
}

describe("gear sockets and gems (v8)", () => {
  it("SOCKET_FORGE adds an empty socket when rarity allows", () => {
    let state = withBench(701);
    state = {
      ...state,
      scrap: state.scrap + SOCKET_FORGE_SCRAP,
      materials: { ...state.materials, alloy: 3, compound: 3, fiber: 3 },
      inventory: [testGear({ id: "rare-a", slot: "weapon", rarity: "Rare", power: 8 })],
    };
    expect(materialsCanAfford(state, SOCKET_FORGE_MATERIALS)).toBe(true);
    state = applyCommand(state, {
      ...baseCmd(),
      type: "SOCKET_FORGE",
      inventoryIndex: 0,
    } as GameCommand);
    expect(state.inventory[0]?.sockets).toHaveLength(1);
    expect(state.inventory[0]?.sockets[0]).toBeNull();
  });

  it("GEM_COMBINE merges three same kind+tier gems", () => {
    let state = withBench(702);
    state = {
      ...state,
      gemInventory: [
        makeGemItem({ id: "g1", kind: "ruby", tier: 1 }),
        makeGemItem({ id: "g2", kind: "ruby", tier: 1 }),
        makeGemItem({ id: "g3", kind: "ruby", tier: 1 }),
      ],
    };
    const before = state.gemInventory.length;
    state = applyCommand(state, {
      ...baseCmd(),
      type: "GEM_COMBINE",
      gemInventoryIndices: [0, 1, 2],
    } as GameCommand);
    expect(state.gemInventory).toHaveLength(before - GEM_COMBINE_INPUT_COUNT + 1);
    expect(state.gemInventory.some((g) => g.kind === "ruby" && g.tier === 2)).toBe(true);
  });

  it("SOCKET_GEM / UNSOCKET_GEM round-trip on inventory gear", () => {
    let state = withBench(703);
    const gem = makeGemItem({ id: "gx", kind: "topaz", tier: 2 });
    state = {
      ...state,
      gemInventory: [gem],
      inventory: [
        sanitizeGearItem({
          ...testGear({ id: "epic-a", slot: "armor", rarity: "Epic", power: 10 }),
          sockets: [null],
        }),
      ],
    };
    state = applyCommand(state, {
      ...baseCmd(),
      type: "SOCKET_GEM",
      gemInventoryIndex: 0,
      socketIndex: 0,
      inventoryGearIndex: 0,
    } as GameCommand);
    expect(state.gemInventory).toHaveLength(0);
    expect(state.inventory[0]?.sockets[0]?.id).toBe("gx");

    state = applyCommand(state, {
      ...baseCmd(),
      type: "UNSOCKET_GEM",
      socketIndex: 0,
      inventoryGearIndex: 0,
    } as GameCommand);
    expect(state.inventory[0]?.sockets[0]).toBeNull();
    expect(state.gemInventory.some((g) => g.id === "gx")).toBe(true);
  });

  it("save v8 round-trips gemInventory", () => {
    let state = withBench(704);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(5),
      wave: 5,
      gemInventory: [makeGemItem({ id: "save-g", kind: "sapphire", tier: 1 })],
    };
    const json = saveToJson(state, Date.now());
    const loaded = loadFromJson(json);
    expect(loaded.state.gemInventory).toHaveLength(1);
    expect(loaded.state.gemInventory[0]?.kind).toBe("sapphire");
  });
});
