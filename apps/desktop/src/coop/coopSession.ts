import {
  applyGameStateDelta,
  diffGameState,
  markGuestDisconnected,
  processPendingJoins,
  scheduleCoopJoin,
  validateGuestCommand,
  dispatch,
  type GameCommand,
  type PendingCoopJoin,
} from "@zbd/sim";
import type { GameRuntime, CommandInput } from "../game/runtime";
import { issueCommand } from "../game/runtime";

export type CoopSession = {
  relayClientId: string | null;
  pendingJoins: PendingCoopJoin[];
  lastBroadcastState: import("@zbd/sim").GameState | null;
};

export function createCoopSession(): CoopSession {
  return { relayClientId: null, pendingJoins: [], lastBroadcastState: null };
}

export function onRelayHello(session: CoopSession, clientId: string, rt: GameRuntime): GameRuntime {
  session.relayClientId = clientId;
  return { ...rt, playerId: clientId, relayClientId: clientId };
}

export function onPlayerJoined(
  session: CoopSession,
  rt: GameRuntime,
  clientId: string,
): GameRuntime {
  if (!rt.isCoopHost) return rt;
  session.pendingJoins = scheduleCoopJoin(
    session.pendingJoins,
    clientId,
    rt.state.tick,
    `Guest ${clientId.slice(0, 4)}`,
  );
  return rt;
}

export function onPlayerLeft(session: CoopSession, rt: GameRuntime, clientId: string): GameRuntime {
  if (!rt.isCoopHost) return rt;
  session.pendingJoins = session.pendingJoins.filter((p) => p.clientId !== clientId);
  return { ...rt, state: markGuestDisconnected(rt.state, clientId) };
}

export function hostTickCoop(session: CoopSession, rt: GameRuntime): GameRuntime {
  if (!rt.isCoopHost) return rt;
  const { state, pending } = processPendingJoins(rt.state, session.pendingJoins);
  session.pendingJoins = pending;
  return { ...rt, state };
}

export function applyHostGuestCommand(
  session: CoopSession,
  rt: GameRuntime,
  fromClientId: string,
  partial: CommandInput,
): GameRuntime {
  void session;
  const cmd = {
    ...partial,
    id: crypto.randomUUID(),
    playerId: fromClientId,
    issuedAtTick: rt.state.tick,
  } as GameCommand;
  const validated = validateGuestCommand(rt.state, fromClientId, cmd);
  if (!validated) return rt;
  return { ...rt, state: dispatch(rt.state, validated) };
}

export function applyLocalCommand(session: CoopSession, rt: GameRuntime, partial: CommandInput): GameRuntime {
  const next = issueCommand(rt, partial);
  session.lastBroadcastState = next.state;
  return next;
}

export function buildHostDelta(session: CoopSession, rt: GameRuntime): import("@zbd/sim").GameStateDelta | null {
  const prev = session.lastBroadcastState ?? rt.state;
  const delta = diffGameState(prev, rt.state);
  if (delta) session.lastBroadcastState = rt.state;
  return delta;
}

export function applyGuestDelta(rt: GameRuntime, delta: import("@zbd/sim").GameStateDelta): GameRuntime {
  const state = applyGameStateDelta(rt.state, delta);
  const owned = state.survivors.find((s) => s.controllerId === rt.relayClientId);
  return { ...rt, state, assignedSurvivorId: owned?.id ?? rt.assignedSurvivorId };
}

export function assignGuestSurvivor(rt: GameRuntime): GameRuntime {
  if (rt.isCoopHost || !rt.relayClientId) return rt;
  const owned = rt.state.survivors.find((s) => s.controllerId === rt.relayClientId);
  return { ...rt, assignedSurvivorId: owned?.id ?? null };
}
