import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState, dispatch } from "./index.js";
import {
  CAMPAIGN_LAST_STAGE_KEY,
  advanceCampaignAfterStageClear,
  campaignStageIsBoss,
  campaignWaveNumberFromStageKey,
  coordsFromStageKey,
  stageKeyFromCoords,
  stageKeyFromParts,
} from "./campaign.js";
import { advanceTicks } from "./tick.js";
import { waveIsBoss } from "./waves.js";

describe("campaign grid geometry", () => {
  it("maps 120 linear keys to tier × act × stage", () => {
    expect(campaignWaveNumberFromStageKey(0)).toBe(1);
    const last = coordsFromStageKey(CAMPAIGN_LAST_STAGE_KEY);
    expect(last.tier).toBe(3);
    expect(last.act).toBe(2);
    expect(last.stage).toBe(10);
    expect(campaignWaveNumberFromStageKey(CAMPAIGN_LAST_STAGE_KEY)).toBe(120);
  });

  it("round-trips coords ↔ stage key", () => {
    const k = stageKeyFromParts(2, 1, 7);
    expect(coordsFromStageKey(k)).toEqual({ tier: 2, act: 1, stage: 7 });
    expect(stageKeyFromCoords({ tier: 2, act: 1, stage: 7 })).toBe(k);
  });

  it("boss flag on stage 10 of each act matches waveIsBoss(encounter wave)", () => {
    for (let tier = 0; tier < 4; tier++) {
      for (let act = 0; act < 3; act++) {
        const bossKey = stageKeyFromParts(tier, act, 10);
        const w = campaignWaveNumberFromStageKey(bossKey);
        expect(campaignStageIsBoss(bossKey)).toBe(true);
        expect(waveIsBoss(w)).toBe(true);
        const nonBossKey = stageKeyFromParts(tier, act, 9);
        expect(campaignStageIsBoss(nonBossKey)).toBe(false);
      }
    }
  });
});

describe("campaign advancement", () => {
  it("unlocks next stage after first clear", () => {
    const a = advanceCampaignAfterStageClear(0, -1);
    expect(a.campaignHighestClearedKey).toBe(0);
    expect(a.currentStageKey).toBe(1);
  });

  it("keeps current stage when replaying a farm", () => {
    const a = advanceCampaignAfterStageClear(3, 10);
    expect(a.campaignHighestClearedKey).toBe(10);
    expect(a.currentStageKey).toBe(3);
  });
});

describe("SET_CAMPAIGN_STAGE command", () => {
  it("no-ops until at least one stage is cleared", () => {
    let state = createInitialState(1);
    state = applyCommand(state, {
      type: "SET_CAMPAIGN_STAGE",
      id: "x",
      playerId: "p",
      issuedAtTick: 0,
      tier: 0,
      act: 0,
      stage: 1,
    });
    expect(state.currentStageKey).toBe(0);
  });

  it("selects a cleared stage for farming", () => {
    let state = createInitialState(2);
    state = { ...state, campaignHighestClearedKey: 5, currentStageKey: 6 };
    state = applyCommand(state, {
      type: "SET_CAMPAIGN_STAGE",
      id: "x",
      playerId: "p",
      issuedAtTick: 0,
      tier: 0,
      act: 0,
      stage: 2,
    });
    expect(state.currentStageKey).toBe(stageKeyFromParts(0, 0, 2));
    expect(state.wave).toBe(campaignWaveNumberFromStageKey(state.currentStageKey));
  });

  it("rejects selecting uncleared stages", () => {
    let state = createInitialState(3);
    state = { ...state, campaignHighestClearedKey: 2, currentStageKey: 2 };
    const before = state.currentStageKey;
    state = applyCommand(state, {
      type: "SET_CAMPAIGN_STAGE",
      id: "x",
      playerId: "p",
      issuedAtTick: 0,
      tier: 0,
      act: 2,
      stage: 10,
    });
    expect(state.currentStageKey).toBe(before);
  });
});

describe("campaign + tick integration", () => {
  it("records a cleared stage (idle sim auto-starts the next fight)", () => {
    let state = createInitialState(99);
    state = dispatch(state, {
      type: "START_WAVE",
      id: "sw",
      playerId: "p",
      issuedAtTick: state.tick,
    });
    expect(state.combat).not.toBeNull();
    let guard = 0;
    while (state.campaignHighestClearedKey < 0 && guard < 80_000) {
      state = advanceTicks(state, 400);
      guard += 400;
    }
    expect(state.campaignHighestClearedKey).toBeGreaterThanOrEqual(0);
    expect(state.currentStageKey).toBeGreaterThanOrEqual(1);
  });
});
