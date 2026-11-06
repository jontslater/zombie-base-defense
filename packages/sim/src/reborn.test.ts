import { describe, expect, it } from "vitest";
import {
  REBORN_MIN_WAVE,
  rebornDpsMultiplier,
  rebornIncomeMultiplier,
  rebornStartingCurrency,
} from "./constants.js";
import { applyCommand, applyReborn, createInitialState, saveToJson, loadFromJson } from "./index.js";
import { advanceTicks } from "./tick.js";

describe("Reborn prestige", () => {
  it("increments stack and resets run after minimum wave", () => {
    let state = createInitialState(7);
    state = { ...state, wave: REBORN_MIN_WAVE, combat: null };
    const next = applyReborn(state);
    expect(next.rebornCount).toBe(1);
    expect(next.wave).toBe(1);
    expect(next.scrap).toBe(0);
    expect(next.inventory).toHaveLength(0);
    expect(next.currency).toBe(rebornStartingCurrency(REBORN_MIN_WAVE));
    expect(next.lifetimeCurrencyEarned).toBeGreaterThanOrEqual(
      state.lifetimeCurrencyEarned + rebornStartingCurrency(REBORN_MIN_WAVE),
    );
  });

  it("no-ops when wave is below minimum", () => {
    const state = createInitialState(8);
    const low = { ...state, wave: REBORN_MIN_WAVE - 1, combat: null };
    expect(applyReborn(low)).toEqual(low);
  });

  it("no-ops during combat", () => {
    let state = createInitialState(9);
    state = {
      ...state,
      wave: 10,
      combat: {
        zombiesRemaining: 1,
        zombiesMax: 1,
        zombieHp: 10,
        zombieDamage: 1,
        isBoss: false,
        bossHpMultiplier: 1,
        killsThisWave: 0,
        wasBossWave: false,
      },
    };
    expect(applyReborn(state)).toEqual(state);
  });

  it("persists rebornCount and lifetimeCurrencyEarned through save", () => {
    let state = createInitialState(11);
    state = { ...state, wave: REBORN_MIN_WAVE, combat: null, rebornCount: 0 };
    state = applyReborn(state);
    const json = saveToJson(state, 0);
    const loaded = loadFromJson(json);
    expect(loaded.state.rebornCount).toBe(1);
    expect(loaded.state.lifetimeCurrencyEarned).toBe(state.lifetimeCurrencyEarned);
  });

  it("income and DPS multipliers stack with rebornCount", () => {
    expect(rebornIncomeMultiplier(1)).toBeGreaterThan(rebornIncomeMultiplier(0));
    expect(rebornDpsMultiplier(2)).toBeGreaterThan(rebornDpsMultiplier(1));
  });
});

describe("REBORN command", () => {
  it("is accepted by applyCommand", () => {
    let state = createInitialState(12);
    state = { ...state, wave: REBORN_MIN_WAVE, combat: null };
    state = applyCommand(state, {
      type: "REBORN",
      id: "r1",
      playerId: "p",
      issuedAtTick: state.tick,
    });
    expect(state.rebornCount).toBe(1);
  });
});

describe("post-Reborn progression", () => {
  it("still clears the next idle wave with ticks", () => {
    let state = createInitialState(77);
    state = { ...state, wave: REBORN_MIN_WAVE, combat: null };
    state = applyReborn(state);
    const tick0 = state.tick;
    state = advanceTicks(state, 500);
    expect(state.wave).toBeGreaterThanOrEqual(2);
    expect(state.tick).toBeGreaterThan(tick0);
  });
});
