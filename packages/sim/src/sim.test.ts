import { describe, expect, it } from "vitest";
import {
  INITIAL_CURRENCY,
  OFFLINE_CAP_MS,
  RARITIES,
  SAVE_VERSION,
  TICKS_PER_SECOND,
  applyOfflineProgress,
  buildWaveCombat,
  computeOfflineTicks,
  createInitialState,
  loadFromJson,
  parseSave,
  rollLoot,
  saveToJson,
  waveIsBoss,
  withRng,
} from "./index.js";
import { stageKeyFromCampaignWave } from "./campaign.js";

describe("wave scaling", () => {
  it("increases zombie stats with wave", () => {
    const w1 = buildWaveCombat(1);
    const w15 = buildWaveCombat(15);
    expect(w15.zombieHp).toBeGreaterThan(w1.zombieHp);
    expect(w15.zombieDamage).toBeGreaterThan(w1.zombieDamage);
    expect(w15.zombiesMax).toBeGreaterThan(w1.zombiesMax);
  });

  it("marks boss waves every 10", () => {
    expect(waveIsBoss(10)).toBe(true);
    expect(waveIsBoss(20)).toBe(true);
    expect(waveIsBoss(9)).toBe(false);
    const boss = buildWaveCombat(10);
    expect(boss.isBoss).toBe(true);
    expect(boss.zombieHp).toBeGreaterThan(buildWaveCombat(9).zombieHp);
  });
});

describe("loot rolls", () => {
  it("returns valid rarities", () => {
    let state = createInitialState(42);
    for (let i = 0; i < 200; i++) {
      const { state: next, item } = rollLoot(state);
      state = next;
      if (item) {
        expect(RARITIES).toContain(item.rarity);
        expect(item.power).toBeGreaterThan(0);
      }
    }
  });

  it("is deterministic for a fixed seed", () => {
    const a = rollLoot(createInitialState(999));
    const b = rollLoot(createInitialState(999));
    expect(a.item?.id).toEqual(b.item?.id);
    expect(a.item?.rarity).toEqual(b.item?.rarity);
  });
});

describe("save round-trip", () => {
  it("preserves state through JSON", () => {
    const state = createInitialState(1);
    state.currency = 1234;
    state.wave = 7;
    const json = saveToJson(state, Date.now());
    const loaded = loadFromJson(json);
    expect(loaded.state.currency).toBe(1234);
    expect(loaded.state.wave).toBe(7);
    expect(loaded.state.survivors).toHaveLength(2);
  });

  it("migrates legacy v1-ish saves with missing fields", () => {
    const legacy = {
      version: 1,
      savedAtMs: 1,
      state: {
        tick: 10,
        wave: 4,
        currency: 100,
        scrap: 2,
        baseCoreHp: 150,
        baseCoreMaxHp: 200,
        upgrades: { wall: 1 },
        survivors: [],
        combat: null,
        inventory: [],
        totalKills: 3,
        rngState: 99,
      },
    };
    const env = parseSave(JSON.stringify(legacy));
    expect(env.version).toBe(SAVE_VERSION);
    expect(env.state.wave).toBe(4);
    expect(env.state.survivors).toHaveLength(2);
    expect(env.state.upgrades.generator).toBe(0);
    expect(env.state.upgrades.wall).toBe(1);
    expect(env.state.materials.alloy).toBe(0);
    expect(env.state.rebornCount).toBe(0);
    expect(env.state.lifetimeCurrencyEarned).toBe(INITIAL_CURRENCY);
    expect(env.state.currentStageKey).toBe(stageKeyFromCampaignWave(4));
    expect(env.state.campaignHighestClearedKey).toBeGreaterThanOrEqual(-1);
    expect(env.state.perimeterUnlocked).toEqual({});
    expect(env.state.gemInventory).toEqual([]);
  });

  it("rejects invalid save envelopes", () => {
    expect(() => parseSave("{}")).toThrow();
  });
});

describe("offline progress", () => {
  it("caps at 8 hours of ticks", () => {
    const now = 1_000_000_000_000;
    const saved = now - OFFLINE_CAP_MS - 60_000;
    const ticks = computeOfflineTicks(saved, now);
    expect(ticks).toBe(OFFLINE_CAP_MS / 1000 * TICKS_PER_SECOND);
  });

  it("advances simulation when applying offline", () => {
    const state = createInitialState(55);
    const savedAt = 0;
    const after = applyOfflineProgress(state, savedAt, 60_000);
    expect(after.tick).toBeGreaterThan(state.tick);
  });
});

describe("rng", () => {
  it("advances state", () => {
    const s = createInitialState(1);
    const { rngState } = withRng(s, (r) => r.next());
    expect(rngState).not.toBe(s.rngState);
  });
});
