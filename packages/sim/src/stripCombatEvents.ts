import type { GameState } from "./types.js";
import { survivorDps } from "./waves.js";
import { TICKS_PER_SECOND } from "./constants.js";
import { stripZombieKindAtSlot, type StripCombatSnapshot } from "./stripSnapshot.js";
import type { ZombieKindId } from "./zombieKinds.js";
import type { SurvivorRoleId } from "./survivorRoles.js";

export type StripCombatFxEvent =
  | {
      kind: "zombie_hit";
      tick: number;
      damage: number;
      killing: boolean;
      zombieKind: ZombieKindId;
      attackerIndex: number;
      attackerRole: SurvivorRoleId;
      isBossWave: boolean;
    }
  | {
      kind: "zombie_kill";
      tick: number;
      zombieKind: ZombieKindId;
      isBossWave: boolean;
    }
  | {
      kind: "survivor_hurt";
      tick: number;
      survivorIndex: number;
      damage: number;
      isBossWave: boolean;
    }
  | {
      kind: "core_hit";
      tick: number;
      damage: number;
      isBossWave: boolean;
    };

export type StripCombatFxPrev = {
  tick: number;
  zombiesRemaining: number;
  zombieHp: number;
  survivorHp: number[];
  baseCoreHp: number;
};

function pickAttacker(state: GameState, tick: number): { index: number; role: SurvivorRoleId } {
  const n = Math.max(1, state.survivors.length);
  const index = tick % n;
  const sv = state.survivors[index] ?? state.survivors[0]!;
  return { index, role: sv.role };
}

export function deriveStripCombatFxEvents(
  prev: StripCombatFxPrev | null,
  state: GameState,
  snap: StripCombatSnapshot | null,
): StripCombatFxEvent[] {
  if (!snap || !state.combat || !prev || state.tick <= prev.tick) return [];

  const c = state.combat;
  const events: StripCombatFxEvent[] = [];
  const kills = prev.zombiesRemaining - c.zombiesRemaining;
  const boss = snap.isBoss;
  const attacker = pickAttacker(state, state.tick);

  const nVisible = boss ? Math.min(c.zombiesRemaining + kills, 5) : Math.min(c.zombiesRemaining + kills, 10);
  const frontKind = stripZombieKindAtSlot(snap, 0, Math.max(1, nVisible));

  if (kills > 0) {
    for (let k = 0; k < kills; k++) {
      const remainingAfter = prev.zombiesRemaining - k - 1;
      const visible = boss ? Math.min(remainingAfter, 5) : Math.min(remainingAfter, 10);
      const kind = stripZombieKindAtSlot(
        { ...snap, zombiesRemaining: Math.max(0, remainingAfter) },
        0,
        Math.max(1, visible),
      );
      events.push({ kind: "zombie_kill", tick: state.tick, zombieKind: kind, isBossWave: boss });
    }
    const killingDamage = Math.max(0, prev.zombieHp);
    if (killingDamage > 0) {
      events.push({
        kind: "zombie_hit",
        tick: state.tick,
        damage: killingDamage,
        killing: true,
        zombieKind: frontKind,
        attackerIndex: attacker.index,
        attackerRole: attacker.role,
        isBossWave: boss,
      });
    }
  } else if (c.zombiesRemaining > 0 && prev.zombieHp > c.zombieHp) {
    const dps = survivorDps(state);
    const damage = Math.min(prev.zombieHp - c.zombieHp, dps / TICKS_PER_SECOND + 0.001);
    if (damage > 0.0001) {
      events.push({
        kind: "zombie_hit",
        tick: state.tick,
        damage,
        killing: false,
        zombieKind: frontKind,
        attackerIndex: attacker.index,
        attackerRole: attacker.role,
        isBossWave: boss,
      });
    }
  }

  for (let i = 0; i < state.survivors.length; i++) {
    const prevHp = prev.survivorHp[i];
    const cur = state.survivors[i]!.hp;
    if (prevHp !== undefined && cur < prevHp - 0.0001) {
      events.push({
        kind: "survivor_hurt",
        tick: state.tick,
        survivorIndex: i,
        damage: prevHp - cur,
        isBossWave: boss,
      });
    }
  }

  if (prev.baseCoreHp > state.baseCoreHp + 0.0001) {
    events.push({
      kind: "core_hit",
      tick: state.tick,
      damage: prev.baseCoreHp - state.baseCoreHp,
      isBossWave: boss,
    });
  }

  return events;
}

export function captureStripCombatFxPrev(state: GameState): StripCombatFxPrev | null {
  if (!state.combat) return null;
  return {
    tick: state.tick,
    zombiesRemaining: state.combat.zombiesRemaining,
    zombieHp: state.combat.zombieHp,
    survivorHp: state.survivors.map((s) => s.hp),
    baseCoreHp: state.baseCoreHp,
  };
}
