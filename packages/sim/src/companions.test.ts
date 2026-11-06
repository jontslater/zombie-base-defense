import { describe, expect, it } from "vitest";
import { applyCompanionUnlocks } from "./achievements.js";
import { COMPANIONS, companionDef } from "./companions.js";
import { createInitialState } from "./save.js";
import { zombieKindForKill } from "./zombieKinds.js";

describe("companion unlocks", () => {
  it("unlocks alarms_dog after enough shambler kills", () => {
    let state = createInitialState(1);
    state = {
      ...state,
      lifetimeKillsByKind: { ...state.lifetimeKillsByKind, shambler: 40 },
    };
    const next = applyCompanionUnlocks(state);
    expect(next.companionsUnlocked.alarms_dog).toBe(true);
  });

  it("assigns deterministic zombie kinds from spawn index", () => {
    const k0 = zombieKindForKill({
      encounterWave: 1,
      isBoss: false,
      zombiesMax: 10,
      spawnIndex: 0,
    });
    const k1 = zombieKindForKill({
      encounterWave: 1,
      isBoss: false,
      zombiesMax: 10,
      spawnIndex: 1,
    });
    expect(k0).toBe(k1);
    const bossLast = zombieKindForKill({
      encounterWave: 10,
      isBoss: true,
      zombiesMax: 5,
      spawnIndex: 4,
    });
    expect(bossLast).toBe("boss");
  });

  it("exports eight companion defs with unique ids", () => {
    expect(COMPANIONS).toHaveLength(8);
    const ids = new Set(COMPANIONS.map((c) => c.id));
    expect(ids.size).toBe(8);
    for (const c of COMPANIONS) {
      expect(companionDef(c.id)?.spriteKey).toBeDefined();
    }
  });
});
