import { describe, expect, it } from "vitest";
import type { StripCombatSnapshot } from "./stripSnapshot.js";
import { stripZombieKindAtSlot } from "./stripSnapshot.js";
import { gemSpriteKeyForKind, stripSurvivorSpriteKey, stripZombieSpriteKey } from "./spriteKeys.js";
import { SURVIVOR_ROLE_IDS } from "./survivorRoles.js";
import { zombieKindForKill } from "./zombieKinds.js";

describe("spriteKeys", () => {
  it("maps each TBH role to survivor_<role> atlas keys by frame phase", () => {
    for (const role of SURVIVOR_ROLE_IDS) {
      const base = `survivor_${role}`;
      expect(stripSurvivorSpriteKey(role, 0, "idle")).toBe(base);
      expect(stripSurvivorSpriteKey(role, 1, "attack")).toBe(`${base}_attack`);
      expect(stripSurvivorSpriteKey(role, 0, "hurt")).toBe(`${base}_hurt`);
    }
  });

  it("uses the same keys for even and odd survivor slots (per-role art is not index-alternated)", () => {
    expect(stripSurvivorSpriteKey("hunter", 0, "idle")).toBe("survivor_hunter");
    expect(stripSurvivorSpriteKey("hunter", 1, "idle")).toBe("survivor_hunter");
  });

  it("maps zombie kinds to frame keys", () => {
    expect(stripZombieSpriteKey("shambler", "walk")).toBe("shambler");
    expect(stripZombieSpriteKey("boss", "attack")).toBe("boss_attack");
    expect(stripZombieSpriteKey("runner", "die")).toBe("runner_die");
  });

  it("maps socket gem kinds to gem_* slice keys", () => {
    expect(gemSpriteKeyForKind("ruby")).toBe("gem_red");
    expect(gemSpriteKeyForKind("sapphire")).toBe("gem_blue");
    expect(gemSpriteKeyForKind("topaz")).toBe("gem_green");
  });

  it("stripZombieKindAtSlot uses the same spawnIndex as zombieKindForKill for visible slots", () => {
    const snap = {
      encounterWave: 10,
      isBoss: false,
      zombiesRemaining: 5,
      zombiesMax: 12,
    } as StripCombatSnapshot;
    const r = snap.zombiesRemaining;
    for (let slot = 0; slot < 3; slot++) {
      const spawnIndex = Math.max(0, r - 1 - slot);
      expect(stripZombieKindAtSlot(snap, slot, 3)).toBe(
        zombieKindForKill({
          encounterWave: snap.encounterWave,
          isBoss: snap.isBoss,
          zombiesMax: snap.zombiesMax,
          spawnIndex,
        }),
      );
    }
  });
});
