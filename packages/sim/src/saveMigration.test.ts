import { describe, expect, it } from "vitest";
import { SAVE_VERSION } from "./constants.js";
import { loadFromJson } from "./index.js";
import type { GameState } from "./types.js";

describe("save migration v7 → v8 survivor roles/skills", () => {
  it("maps legacy boolean skills to ranked tree after perimeter-era save", () => {
    const legacy: GameState = {
      tick: 0,
      wave: 3,
      currentStageKey: 2,
      campaignHighestClearedKey: 1,
      currency: 10,
      scrap: 0,
      materials: {
        alloy: 0,
        battery: 0,
        compound: 0,
        fiber: 0,
        wiring: 0,
      },
      perimeterUnlocked: {},
      baseCoreHp: 200,
      baseCoreMaxHp: 200,
      upgrades: { wall: 0, turret: 0, generator: 0, workbench: 0 },
      survivors: [
        {
          id: "a",
          name: "A",
          hp: 50,
          maxHp: 50,
          damage: 10,
          skillPoints: 0,
          skills: { damage_1: true, damage_2: true, hp_1: true, loot_1: true },
          gear: {},
          stance: "aggressive",
          target: "nearest",
          controllerId: null,
          aiControlUntilTick: null,
        } as unknown as GameState["survivors"][0],
      ],
      combat: null,
      inventory: [],
      gemInventory: [],
      totalKills: 0,
      rebornCount: 0,
      lifetimeCurrencyEarned: 10,
      rngState: 1,
    };

    const json = JSON.stringify({
      version: 7,
      savedAtMs: 0,
      state: legacy,
    });
    const { state } = loadFromJson(json);
    expect(state.survivors[0]?.role).toBeDefined();
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(8);
    const skills = state.survivors[0]!.skills as Record<string, unknown>;
    expect(Object.keys(skills).length).toBeGreaterThan(0);
    expect(skills["damage_1"]).toBeUndefined();
  });
});
