import { describe, expect, it } from "vitest";
import { createDemoCombatState } from "./demo.js";
import { createInitialState } from "./save.js";
import { computeStripCombatSnapshot } from "./stripSnapshot.js";

describe("stripCombatSnapshot", () => {
  it("is null when not in combat", () => {
    const s = createInitialState(1);
    expect(s.combat).toBeNull();
    expect(computeStripCombatSnapshot(s)).toBeNull();
  });

  it("matches live combat fields for demo seeding", () => {
    const s = createDemoCombatState(42, "mid_fight");
    const snap = computeStripCombatSnapshot(s);
    expect(snap).not.toBeNull();
    expect(snap!.zombiesRemaining).toBe(s.combat!.zombiesRemaining);
    expect(snap!.march01).toBeGreaterThanOrEqual(0);
    expect(snap!.march01).toBeLessThan(1);
  });
});
