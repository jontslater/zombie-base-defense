import { describe, expect, it } from "vitest";
import {
  bloodDropletSpawnCount,
  shouldMergeStripDamageNumber,
  shouldSpawnStripDamageNumber,
  STRIP_BLOOD_GLOBAL_CAP,
  STRIP_BLOOD_PER_HIT,
  STRIP_DAMAGE_NUMBER_CAP,
} from "./stripHitFeelLogic.js";
import {
  DEFAULT_CLIENT_SETTINGS,
  stripHitFlashEnabled,
  stripScreenShakeEnabled,
} from "./clientSettings.js";

describe("stripHitFeelLogic caps", () => {
  it("limits blood droplets by global cap", () => {
    expect(bloodDropletSpawnCount(0)).toBe(STRIP_BLOOD_PER_HIT);
    expect(bloodDropletSpawnCount(STRIP_BLOOD_GLOBAL_CAP - 3)).toBe(3);
    expect(bloodDropletSpawnCount(STRIP_BLOOD_GLOBAL_CAP)).toBe(0);
  });

  it("limits concurrent damage numbers", () => {
    expect(shouldSpawnStripDamageNumber(0)).toBe(true);
    expect(shouldSpawnStripDamageNumber(STRIP_DAMAGE_NUMBER_CAP - 1)).toBe(true);
    expect(shouldSpawnStripDamageNumber(STRIP_DAMAGE_NUMBER_CAP)).toBe(false);
  });

  it("merges damage numbers when crowded at same column", () => {
    expect(shouldMergeStripDamageNumber(STRIP_DAMAGE_NUMBER_CAP, [100], 108)).toBe(true);
    expect(shouldMergeStripDamageNumber(STRIP_DAMAGE_NUMBER_CAP, [100], 200)).toBe(false);
    expect(shouldMergeStripDamageNumber(2, [100], 108)).toBe(false);
  });
});

describe("clientSettings toggles", () => {
  it("defaults hit flash and screen shake on", () => {
    expect(stripHitFlashEnabled(DEFAULT_CLIENT_SETTINGS)).toBe(true);
    expect(stripScreenShakeEnabled(DEFAULT_CLIENT_SETTINGS)).toBe(true);
  });

  it("respects explicit off", () => {
    const off = { stripHitFlash: false, stripScreenShake: false };
    expect(stripHitFlashEnabled(off)).toBe(false);
    expect(stripScreenShakeEnabled(off)).toBe(false);
  });
});
