import {
  COOP_AI_GRACE_TICKS,
  COOP_JOIN_INTERVAL_TICKS,
  type TargetMode,
  type Stance,
} from "./constants.js";
import { SURVIVOR_ROLE_IDS } from "./survivorRoles.js";
import type { GameCommand } from "./commands.js";
import type { GameState, SurvivorState } from "./types.js";

export type PendingCoopJoin = {
  clientId: string;
  joinAtTick: number;
  displayName: string;
};

export function nextCoopJoinTick(currentTick: number): number {
  const step = COOP_JOIN_INTERVAL_TICKS;
  return Math.ceil((currentTick + 1) / step) * step;
}

export function scheduleCoopJoin(
  pending: PendingCoopJoin[],
  clientId: string,
  currentTick: number,
  displayName: string,
): PendingCoopJoin[] {
  if (pending.some((p) => p.clientId === clientId)) return pending;
  return [
    ...pending,
    {
      clientId,
      joinAtTick: nextCoopJoinTick(currentTick),
      displayName: displayName.slice(0, 24) || "Guest",
    },
  ];
}

export function createCoopSurvivor(clientId: string, name: string, index: number): SurvivorState {
  return {
    id: `surv-${clientId.slice(0, 8)}`,
    name,
    role: SURVIVOR_ROLE_IDS[index % SURVIVOR_ROLE_IDS.length]!,
    hp: 75,
    maxHp: 75,
    damage: 10 + index,
    skillPoints: 1,
    skills: {},
    gear: {},
    stance: "aggressive",
    target: "nearest",
    controllerId: clientId,
    aiControlUntilTick: null,
  };
}

export function processPendingJoins(
  state: GameState,
  pending: PendingCoopJoin[],
): { state: GameState; pending: PendingCoopJoin[]; spawned: PendingCoopJoin[] } {
  const spawned: PendingCoopJoin[] = [];
  let survivors = [...state.survivors];
  const remaining: PendingCoopJoin[] = [];

  for (const entry of pending) {
    if (state.tick >= entry.joinAtTick) {
      if (!survivors.some((s) => s.controllerId === entry.clientId)) {
        survivors = [...survivors, createCoopSurvivor(entry.clientId, entry.displayName, survivors.length)];
        spawned.push(entry);
      }
    } else {
      remaining.push(entry);
    }
  }

  return {
    state: { ...state, survivors },
    pending: remaining,
    spawned,
  };
}

export function markGuestDisconnected(state: GameState, clientId: string): GameState {
  const until = state.tick + COOP_AI_GRACE_TICKS;
  return {
    ...state,
    survivors: state.survivors.map((s) =>
      s.controllerId === clientId
        ? { ...s, aiControlUntilTick: until, controllerId: null, stance: "aggressive" as Stance }
        : s,
    ),
  };
}

export function processAiGraceDepartures(state: GameState): GameState {
  const departing = state.survivors.filter(
    (s) => s.aiControlUntilTick !== null && state.tick >= s.aiControlUntilTick,
  );
  if (departing.length === 0) return state;

  const loot: import("./types.js").GearItem[] = [];
  for (const s of departing) {
    for (const item of Object.values(s.gear)) {
      if (item) loot.push(item);
    }
  }

  const keepIds = new Set(departing.map((d) => d.id));
  return {
    ...state,
    inventory: [...state.inventory, ...loot],
    survivors: state.survivors.filter((s) => !keepIds.has(s.id)),
  };
}

const GUEST_ALLOWED: GameCommand["type"][] = [
  "EQUIP_GEAR",
  "UNEQUIP_GEAR",
  "SPEND_SKILL",
  "SET_SURVIVOR_ROLE",
  "SET_STANCE",
  "SET_TARGET",
  "WORKBENCH_ENHANCE",
  "WORKBENCH_REROLL",
  "SALVAGE_GEAR",
  "SYNTHESIS_COMBINE",
  "ALCHEMY_FORGE",
];

export function survivorForClient(state: GameState, clientId: string): SurvivorState | undefined {
  return state.survivors.find((s) => s.controllerId === clientId);
}

export function validateGuestCommand(
  state: GameState,
  clientId: string,
  cmd: GameCommand,
): GameCommand | null {
  if (!GUEST_ALLOWED.includes(cmd.type)) return null;
  const owned = survivorForClient(state, clientId);
  if (!owned) return null;

  switch (cmd.type) {
    case "EQUIP_GEAR":
    case "UNEQUIP_GEAR":
    case "SPEND_SKILL":
    case "SET_SURVIVOR_ROLE":
    case "SET_STANCE":
    case "SET_TARGET":
    case "WORKBENCH_ENHANCE":
      if ("survivorId" in cmd && cmd.survivorId !== owned.id) return null;
      return cmd;
    case "WORKBENCH_REROLL":
    case "SALVAGE_GEAR":
    case "SYNTHESIS_COMBINE":
    case "ALCHEMY_FORGE":
      return cmd;
    default:
      return null;
  }
}

export function stanceDamageMultiplier(stance: Stance): number {
  if (stance === "aggressive") return 1.12;
  if (stance === "defensive") return 0.92;
  return 1;
}

export function targetFocusMultiplier(target: TargetMode, isBossWave: boolean): number {
  if (target === "boss" && isBossWave) return 1.15;
  if (target === "weakest") return 1.05;
  return 1;
}
