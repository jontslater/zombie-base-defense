import { describe, expect, it } from "vitest";
import { createInitialState } from "./index.js";
import { simTick } from "./tick.js";
import { createDemoCombatState } from "./demo.js";
import {
  captureStripCombatFxPrev,
  deriveStripCombatFxEvents,
} from "./stripCombatEvents.js";
import { computeStripCombatSnapshot } from "./stripSnapshot.js";

describe("stripCombatEvents", () => {
  it("emits zombie_hit while draining HP", () => {
    let state = createDemoCombatState(1, "mid_fight");
    const prev = captureStripCombatFxPrev(state)!;
    state = simTick(state);
    const snap = computeStripCombatSnapshot(state)!;
    const events = deriveStripCombatFxEvents(prev, state, snap);
    expect(events.some((e) => e.kind === "zombie_hit")).toBe(true);
  });

  it("does not emit when combat idle", () => {
    const state = createInitialState();
    expect(deriveStripCombatFxEvents(null, state, null)).toEqual([]);
  });
});
