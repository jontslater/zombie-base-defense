import { describe, expect, it } from "vitest";
import {
  COOP_JOIN_INTERVAL_TICKS,
  applyCommand,
  createInitialState,
  dispatch,
  markGuestDisconnected,
  nextCoopJoinTick,
  processAiGraceDepartures,
  processPendingJoins,
  scheduleCoopJoin,
  validateGuestCommand,
  type GameCommand,
} from "./index.js";

describe("co-op join scheduling", () => {
  it("schedules on next 5s boundary", () => {
    expect(nextCoopJoinTick(0)).toBe(COOP_JOIN_INTERVAL_TICKS);
    expect(nextCoopJoinTick(COOP_JOIN_INTERVAL_TICKS - 1)).toBe(COOP_JOIN_INTERVAL_TICKS);
    expect(nextCoopJoinTick(COOP_JOIN_INTERVAL_TICKS)).toBe(COOP_JOIN_INTERVAL_TICKS * 2);
  });

  it("spawns guest survivor at join tick", () => {
    let state = createInitialState(1);
    state = { ...state, tick: COOP_JOIN_INTERVAL_TICKS };
    let pending = scheduleCoopJoin([], "guest-abc", 0, "Riley");
    const result = processPendingJoins(state, pending);
    expect(result.spawned).toHaveLength(1);
    expect(result.state.survivors.some((s) => s.controllerId === "guest-abc")).toBe(true);
  });
});

describe("co-op disconnect grace", () => {
  it("departs survivor and keeps loot in inventory", () => {
    let state = createInitialState(2);
    state = {
      ...state,
      survivors: [
        {
          ...state.survivors[0]!,
          controllerId: "guest-1",
          aiControlUntilTick: 100,
          gear: {
            weapon: { id: "w1", slot: "weapon", rarity: "Rare", power: 10 },
          },
        },
      ],
      tick: 100,
    };
    state = processAiGraceDepartures(state);
    expect(state.survivors).toHaveLength(0);
    expect(state.inventory.some((i) => i.id === "w1")).toBe(true);
  });

  it("starts AI grace on disconnect", () => {
    let state = createInitialState(3);
    state = {
      ...state,
      survivors: [{ ...state.survivors[0]!, controllerId: "guest-1", id: "surv-guest" }],
      tick: 10,
    };
    state = markGuestDisconnected(state, "guest-1");
    const s = state.survivors[0]!;
    expect(s.controllerId).toBeNull();
    expect(s.aiControlUntilTick).toBeGreaterThan(10);
  });
});

describe("guest command validation", () => {
  it("rejects commands for other survivors", () => {
    const state = createInitialState(4);
    const cmd: GameCommand = {
      id: "1",
      playerId: "guest-1",
      issuedAtTick: 0,
      type: "SET_STANCE",
      survivorId: state.survivors[1]!.id,
      stance: "defensive",
    };
    const ownedState = {
      ...state,
      survivors: [{ ...state.survivors[0]!, controllerId: "guest-1" }, state.survivors[1]!],
    };
    expect(validateGuestCommand(ownedState, "guest-1", cmd)).toBeNull();
  });

  it("allows equip on owned survivor", () => {
    let state = createInitialState(5);
    state = {
      ...state,
      inventory: [{ id: "i1", slot: "weapon", rarity: "Common", power: 5 }],
      survivors: [{ ...state.survivors[0]!, controllerId: "guest-1", id: "surv-guest" }],
    };
    const cmd: GameCommand = {
      id: "2",
      playerId: "guest-1",
      issuedAtTick: 0,
      type: "EQUIP_GEAR",
      survivorId: "surv-guest",
      inventoryIndex: 0,
    };
    const validated = validateGuestCommand(state, "guest-1", cmd);
    expect(validated?.type).toBe("EQUIP_GEAR");
    state = dispatch(state, validated!);
    expect(state.survivors[0]?.gear.weapon?.id).toBe("i1");
  });
});

describe("workbench commands", () => {
  it("enhances equipped gear when workbench unlocked", () => {
    let state = createInitialState(6);
    state = applyCommand(state, {
      id: "u",
      playerId: "host",
      issuedAtTick: 0,
      type: "UPGRADE_BASE",
      upgradeId: "workbench",
    });
    state = {
      ...state,
      scrap: 10,
      survivors: [
        {
          ...state.survivors[0]!,
          gear: { weapon: { id: "w", slot: "weapon", rarity: "Common", power: 4 } },
        },
      ],
    };
    state = applyCommand(state, {
      id: "e",
      playerId: "host",
      issuedAtTick: 0,
      type: "WORKBENCH_ENHANCE",
      survivorId: state.survivors[0]!.id,
      slot: "weapon",
    });
    expect(state.survivors[0]?.gear.weapon?.power).toBeGreaterThan(4);
  });
});
