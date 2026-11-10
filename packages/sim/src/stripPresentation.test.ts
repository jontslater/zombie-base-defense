import { describe, expect, it } from "vitest";
import {
  stripHordePresentation,
  stripZombieSlotX,
  STRIP_MAX_VISIBLE_ZOMBIES,
} from "./stripPresentation.js";

describe("stripPresentation", () => {
  it("caps visible zombies and reports overflow", () => {
    const p = stripHordePresentation(18, false);
    expect(p.visibleSlots).toBe(STRIP_MAX_VISIBLE_ZOMBIES);
    expect(p.overflow).toBe(14);
    expect(p.silhouettes).toBe(2);
  });

  it("spaces zombie slots toward the base", () => {
    expect(stripZombieSlotX(0, 4, false)).toBeGreaterThan(stripZombieSlotX(3, 4, false));
  });
});
