import { describe, expect, it } from "vitest";
import {
  OFFLINE_ABSENCE_MAX_MS,
  OFFLINE_CAP_BASE_MS,
  OFFLINE_CAP_BONUS_MS_PER_UNLOCKED_NODE,
  applyOfflineProgress,
  createInitialState,
  parseSave,
  SAVE_VERSION,
} from "./index.js";
import {
  buildOfflineRaidReport,
  computeOfflineAccrualCapMs,
  computeOfflineAccrualMs,
  computeOfflineRaidRewards,
} from "./offlineRewards.js";
import { saveToJson } from "./save.js";

describe("offline accrual caps", () => {
  it("defaults to 8h with no perimeter unlocks", () => {
    const s = createInitialState(1);
    expect(computeOfflineAccrualCapMs(s)).toBe(OFFLINE_CAP_BASE_MS);
  });

  it("adds 30m per unlocked perimeter node", () => {
    const s = createInitialState(2);
    s.perimeterUnlocked = { relay_alpha: true, fence_lamps_row2: true };
    expect(computeOfflineAccrualCapMs(s)).toBe(
      OFFLINE_CAP_BASE_MS + 2 * OFFLINE_CAP_BONUS_MS_PER_UNLOCKED_NODE,
    );
  });

  it("clocks backward yields zero accrual", () => {
    const s = createInitialState(3);
    const now = 1_000_000;
    const { accrualMs } = computeOfflineAccrualMs(now + 1000, now, s);
    expect(accrualMs).toBe(0);
  });

  it("clamps absence beyond 30d", () => {
    const s = createInitialState(4);
    const now = 10_000_000_000;
    const saved = now - OFFLINE_ABSENCE_MAX_MS - 60_000;
    const { timeAwayMs, accrualMs } = computeOfflineAccrualMs(saved, now, s);
    expect(timeAwayMs).toBe(OFFLINE_ABSENCE_MAX_MS);
    expect(accrualMs).toBe(OFFLINE_CAP_BASE_MS);
  });
});

describe("offline raid rewards", () => {
  it("is deterministic for fixed seed and duration", () => {
    const a = createInitialState(777);
    a.campaignHighestClearedKey = 10;
    const b = createInitialState(777);
    b.campaignHighestClearedKey = 10;
    const ms = 2 * 60 * 60 * 1000;
    const ra = computeOfflineRaidRewards(a, ms);
    const rb = computeOfflineRaidRewards(b, ms);
    expect(ra.rewards).toEqual(rb.rewards);
  });

  it("scales currency with higher cleared difficulty", () => {
    const low = createInitialState(888);
    low.campaignHighestClearedKey = 0;
    const high = createInitialState(888);
    high.campaignHighestClearedKey = 80;
    const ms = 60 * 60 * 1000;
    const rLow = computeOfflineRaidRewards(low, ms).rewards;
    const rHigh = computeOfflineRaidRewards(high, ms).rewards;
    expect(rHigh.currency).toBeGreaterThan(rLow.currency);
  });

  it("applyOfflineProgress applies rewards without advancing ticks", () => {
    let state = createInitialState(500);
    state.campaignHighestClearedKey = 3;
    const tick0 = state.tick;
    const savedAt = 5_000_000;
    const now = savedAt + 30 * 60 * 1000;
    const { state: after } = applyOfflineProgress(state, savedAt, now);
    expect(after.tick).toBe(tick0);
    expect(after.currency).toBeGreaterThan(state.currency);
  });
});

describe("save v9 → v10 gems field", () => {
  it("adds gems: 0 when missing", () => {
    const json = saveToJson(createInitialState(1), 0);
    const stripped = JSON.parse(json) as { version: number; state: Record<string, unknown> };
    stripped.version = 9;
    delete stripped.state.gems;
    const env = parseSave(JSON.stringify(stripped));
    expect(env.version).toBe(SAVE_VERSION);
    expect(env.state.gems).toBe(0);
  });
});

describe("buildOfflineRaidReport", () => {
  it("returns null when no meaningful away time", () => {
    const s = createInitialState(600);
    const t = 1_234_567_890;
    const { report } = buildOfflineRaidReport(s, t, t);
    expect(report).toBeNull();
  });
});
