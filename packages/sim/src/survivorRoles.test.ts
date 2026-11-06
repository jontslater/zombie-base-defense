import { describe, expect, it } from "vitest";
import {
  SURVIVOR_ROLE_IDS,
  canSpendSkill,
  skillPointCostForNextRank,
  survivorSkillDamageMultiplier,
} from "./survivorRoles.js";
import { SKILL_DEFINITIONS } from "./survivorRoles.js";
import type { SurvivorState } from "./types.js";
import { applyCommand, createInitialState } from "./index.js";

function surv(over: Partial<SurvivorState>): SurvivorState {
  const b = createInitialState(1).survivors[0]!;
  return { ...b, ...over };
}

describe("role + skill tree", () => {
  it("defines six roles and non-overlapping trees", () => {
    expect(SURVIVOR_ROLE_IDS).toHaveLength(6);
    const byRole = new Map<string, number>();
    for (const id of SURVIVOR_ROLE_IDS) {
      byRole.set(id, 0);
    }
    for (const def of Object.values(SKILL_DEFINITIONS)) {
      expect(byRole.has(def.role)).toBe(true);
    }
  });

  it("scales upgrade cost by rank tier", () => {
    const def = SKILL_DEFINITIONS["bl_strike"]!;
    expect(skillPointCostForNextRank(def, 0)).toBe(1);
    expect(skillPointCostForNextRank(def, 1)).toBe(2);
    expect(skillPointCostForNextRank(def, 2)).toBe(3);
  });

  it("requires prereqs and matching role", () => {
    const medic = surv({ role: "medic", skillPoints: 5 });
    expect(canSpendSkill(medic, "bl_strike").ok).toBe(false);
    expect(canSpendSkill(medic, "me_patch").ok).toBe(true);
    const noPts = surv({ role: "brawler", skillPoints: 0, skills: {} });
    expect(canSpendSkill(noPts, "bl_strike").ok).toBe(false);
    const withStrike = surv({ role: "brawler", skillPoints: 5, skills: { bl_strike: 1 } });
    expect(canSpendSkill(withStrike, "bl_heavy").ok).toBe(true);
    const cap = surv({
      role: "brawler",
      skillPoints: 20,
      skills: { bl_strike: 3 },
    });
    expect(canSpendSkill(cap, "bl_strike").reason).toBe("max rank");
  });

  it("stack ranks increase damage multiplier", () => {
    const base = surv({ role: "brawler", skills: {} });
    const ranked = surv({ role: "brawler", skills: { bl_strike: 2 } });
    const b = survivorSkillDamageMultiplier(base, { isBossWave: false });
    const r = survivorSkillDamageMultiplier(ranked, { isBossWave: false });
    expect(r).toBeGreaterThan(b);
  });

  it("SPEND_SKILL increments rank", () => {
    let state = createInitialState(77);
    const id = state.survivors[0]!.id;
    state = {
      ...state,
      survivors: state.survivors.map((s, i) =>
        i === 0 ? { ...s, role: "warden" as const, skillPoints: 3 } : s,
      ),
    };
    state = applyCommand(state, {
      type: "SPEND_SKILL",
      id: "t",
      playerId: "p",
      issuedAtTick: 0,
      survivorId: id,
      nodeId: "wa_bulwark",
    });
    expect(state.survivors[0]?.skills.wa_bulwark).toBe(1);
    expect(state.survivors[0]?.skillPoints).toBe(2);
  });

  it("SET_SURVIVOR_ROLE switches kit", () => {
    let state = createInitialState(88);
    const id = state.survivors[0]!.id;
    state = applyCommand(state, {
      type: "SET_SURVIVOR_ROLE",
      id: "t",
      playerId: "p",
      issuedAtTick: 0,
      survivorId: id,
      role: "medic",
    });
    expect(state.survivors[0]?.role).toBe("medic");
  });
});
