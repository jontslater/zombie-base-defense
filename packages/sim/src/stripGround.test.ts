import { describe, expect, it } from "vitest";
import {
  STRIP_GROUND_Y,
  STRIP_SURVIVOR_SCALE,
  stripFeetOnGround,
  stripSettledAnchorY,
  stripUnitAnchorY,
} from "./stripGround.js";

describe("stripGround planting", () => {
  it("anchors units so feet sit on the ground line", () => {
    const anchor = stripUnitAnchorY(STRIP_SURVIVOR_SCALE);
    expect(stripFeetOnGround(anchor, STRIP_SURVIVOR_SCALE, STRIP_GROUND_Y)).toBe(true);
  });

  it("returns to baseline Y when knockback settled (X-only knockback)", () => {
    const base = stripUnitAnchorY(STRIP_SURVIVOR_SCALE);
    const moving = stripSettledAnchorY(base, 5, "out", 0);
    expect(moving.settled).toBe(false);

    const done = stripSettledAnchorY(base, 0, "none", 0);
    expect(done.settled).toBe(true);
    expect(stripFeetOnGround(done.y, STRIP_SURVIVOR_SCALE, STRIP_GROUND_Y)).toBe(true);
  });
});
