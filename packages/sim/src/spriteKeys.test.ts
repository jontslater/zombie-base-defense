import { describe, expect, it } from "vitest";
import type { StripCombatSnapshot } from "./stripSnapshot.js";
import { stripZombieKindAtSlot } from "./stripSnapshot.js";
import { gemSpriteKeyForKind, stripSurvivorSpriteKey, stripZombieSpriteKey } from "./spriteKeys.js";
import { zombieKindForKill } from "./zombieKinds.js";

describe("spriteKeys", () => {
  it("maps brawler to melee atlas keys by phase", () => {
    expect(stripSurvivorSpriteKey("brawler", 0, "idle")).toBe("survivor_melee");
    expect(stripSurvivorSpriteKey("brawler", 1, "attack")).toBe("survivor_melee_attack");
    expect(stripSurvivorSpriteKey("brawler", 0, "hurt")).toBe("survivor_melee_hurt");
  });

  it("alternates gunner vs soldier appearance by survivor index", () => {
    expect(stripSurvivorSpriteKey("hunter", 0, "idle")).toBe("survivor");
    expect(stripSurvivorSpriteKey("hunter", 1, "idle")).toBe("survivor_alt");
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
