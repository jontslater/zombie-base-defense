import { describe, expect, it } from "vitest";
import {
  ALCHEMY_FORGE_CURRENCY,
  ALCHEMY_FORGE_MATERIALS,
  ALCHEMY_FORGE_SCRAP,
  MATERIAL_IDS,
  REBORN_MIN_WAVE,
  SAVE_VERSION,
} from "./constants.js";
import { stageKeyFromCampaignWave } from "./campaign.js";
import { applyCommand, applyReborn, createInitialState, loadFromJson, saveToJson } from "./index.js";
import type { GameCommand } from "./commands.js";
import { validateGuestCommand } from "./coop.js";
import { perimeterUnlockedCount, tryBuyPerimeterNode } from "./perimeter.js";

function cmdBase(): Pick<GameCommand, "id" | "playerId" | "issuedAtTick"> {
  return { id: "t", playerId: "host", issuedAtTick: 0 };
}

function withForgeResources(seed: number) {
  let state = createInitialState(seed);
  state = applyCommand(state, { ...cmdBase(), type: "UPGRADE_BASE", upgradeId: "workbench" });
  const mats = { ...state.materials };
  for (const id of MATERIAL_IDS) mats[id] += ALCHEMY_FORGE_MATERIALS[id] ?? 0;
  state = {
    ...state,
    scrap: state.scrap + ALCHEMY_FORGE_SCRAP,
    currency: state.currency + ALCHEMY_FORGE_CURRENCY + 50,
    materials: mats,
  };
  return state;
}

describe("perimeter grid purchases", () => {
  it("buys relay_alpha when wave and currency allow", () => {
    let state = createInitialState(501);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(3),
      wave: 3,
      currency: 50,
    };
    const result = tryBuyPerimeterNode(state, "relay_alpha");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currency).toBe(10);
    expect(perimeterUnlockedCount(result.state)).toBe(1);
  });

  it("rejects fence_lamps without parent or kills", () => {
    let state = createInitialState(502);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(5),
      wave: 5,
      currency: 500,
      scrap: 50,
      totalKills: 20,
    };
    const withoutParent = tryBuyPerimeterNode(state, "fence_lamps_row2");
    expect(withoutParent.ok).toBe(false);

    state = {
      ...state,
      perimeterUnlocked: { relay_alpha: true },
      totalKills: 5,
    };
    const lowKills = tryBuyPerimeterNode(state, "fence_lamps_row2");
    expect(lowKills.ok).toBe(false);
  });

  it("buys fence_lamps_row2 after relay and kill milestone", () => {
    let state = createInitialState(503);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(5),
      wave: 5,
      currency: 100,
      scrap: 20,
      totalKills: 20,
      perimeterUnlocked: { relay_alpha: true },
    };
    const result = tryBuyPerimeterNode(state, "fence_lamps_row2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(perimeterUnlockedCount(result.state)).toBe(2);
  });

  it("buys mesh_band_extender with materials", () => {
    let state = createInitialState(504);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(4),
      wave: 4,
      currency: 80,
      perimeterUnlocked: { relay_alpha: true },
      materials: { ...createInitialState(1).materials, alloy: 1, wiring: 1 },
    };
    const result = tryBuyPerimeterNode(state, "mesh_band_extender");
    expect(result.ok).toBe(true);
  });

  it("applies alchemy forge discount when second bench line is unlocked", () => {
    let state = withForgeResources(505);
    state = {
      ...state,
      perimeterUnlocked: { second_bench_line: true },
    };
    const before = state.currency;
    state = applyCommand(state, { ...cmdBase(), type: "ALCHEMY_FORGE", slot: "weapon" });
    expect(state.currency).toBe(before - (ALCHEMY_FORGE_CURRENCY - 5));
  });
});

describe("perimeter save and Reborn", () => {
  it("migrates old saves without perimeterUnlocked", () => {
    const fresh = createInitialState(601);
    const legacyState = { ...fresh } as Record<string, unknown>;
    delete legacyState.perimeterUnlocked;
    const legacy = {
      version: SAVE_VERSION - 1,
      savedAtMs: 0,
      state: legacyState,
    };
    const loaded = loadFromJson(JSON.stringify(legacy));
    expect(loaded.state.perimeterUnlocked).toEqual({});
  });

  it("persists unlocks through save round-trip", () => {
    let state = createInitialState(602);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(3),
      wave: 3,
      currency: 50,
      perimeterUnlocked: {},
    };
    state = applyCommand(state, { ...cmdBase(), type: "BUY_PERIMETER_NODE", nodeId: "relay_alpha" });
    const json = saveToJson(state, 0);
    const { state: loaded } = loadFromJson(json);
    expect(loaded.perimeterUnlocked.relay_alpha).toBe(true);
  });

  it("keeps perimeter unlocks after Reborn", () => {
    let state = createInitialState(603);
    state = {
      ...state,
      currentStageKey: stageKeyFromCampaignWave(REBORN_MIN_WAVE),
      wave: REBORN_MIN_WAVE,
      combat: null,
      perimeterUnlocked: { relay_alpha: true },
    };
    state = applyReborn(state);
    expect(state.perimeterUnlocked.relay_alpha).toBe(true);
    expect(state.wave).toBe(1);
  });
});

describe("co-op host-only perimeter", () => {
  it("rejects BUY_PERIMETER_NODE for guests", () => {
    const state = createInitialState(701);
    const cmd: GameCommand = {
      ...cmdBase(),
      playerId: "guest-1",
      type: "BUY_PERIMETER_NODE",
      nodeId: "relay_alpha",
    };
    expect(validateGuestCommand(state, "guest-1", cmd)).toBeNull();
  });
});
