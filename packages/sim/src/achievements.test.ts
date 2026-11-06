import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, achievementConditionMet, applyAchievementUnlocks } from "./achievements.js";
import { SAVE_VERSION } from "./constants.js";
import { stageKeyFromCampaignWave } from "./campaign.js";
import { createInitialState, loadFromJson, parseSave } from "./save.js";

describe("comms milestones", () => {
  it("defines about thirty data-driven achievements", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("unlocks First Contact after first wave clear counter increments in finalize flow", () => {
    let state = createInitialState(2);
    state = { ...state, meta: { ...state.meta, lifetimeWavesCleared: 1 } };
    const next = applyAchievementUnlocks(state);
    expect(next.achievementsUnlocked.m_w01).toBe(true);
  });

  it("does not award campaign reach milestones with no clears", () => {
    const state = createInitialState(3);
    expect(achievementConditionMet(state, "m_c10")).toBe(false);
  });

  it("awards campaign reach when a stage is cleared", () => {
    let state = createInitialState(4);
    const clearedThroughWave10 = stageKeyFromCampaignWave(10);
    state = {
      ...state,
      campaignHighestClearedKey: clearedThroughWave10,
      currentStageKey: clearedThroughWave10,
      wave: 10,
      meta: { ...state.meta, lifetimeWavesCleared: 1 },
    };
    expect(achievementConditionMet(state, "m_c10")).toBe(true);
  });

  it("migrates saves to version 11 with new fields", () => {
    const fresh = createInitialState(99);
    const body = { ...fresh } as Record<string, unknown>;
    delete body.lifetimeKillsByKind;
    delete body.meta;
    delete body.companionsUnlocked;
    delete body.equippedCompanionId;
    delete body.achievementsUnlocked;
    const legacy = {
      version: 10,
      savedAtMs: 0,
      state: body,
    };
    const env = parseSave(JSON.stringify(legacy));
    expect(env.version).toBe(SAVE_VERSION);
    expect(env.state.lifetimeKillsByKind.shambler).toBe(0);
    expect(env.state.meta.lifetimeTotalKills).toBeGreaterThanOrEqual(0);
    expect(env.state.achievementsUnlocked).toBeDefined();
    const roundTrip = loadFromJson(JSON.stringify(legacy));
    expect(roundTrip.state.equippedCompanionId === null || typeof roundTrip.state.equippedCompanionId === "string").toBe(
      true,
    );
  });
});
