import type { StripCombatSnapshot } from "./stripSnapshot.js";
import type { SurvivorRoleId } from "./survivorRoles.js";

/** Visual floor line in the 400×80 strip (feet rest here). Render-only. */
export const STRIP_GROUND_Y = 52;

/** Source pixels trimmed from the bottom of 64×64 atlas frames (empty padding). */
export const STRIP_FOOT_TRIM_SOURCE_PX = 8;

/** ~30–32px tall units in an 80px strip (64px source frames). */
export const STRIP_SURVIVOR_SCALE = 0.5;
export const STRIP_ZOMBIE_SCALE = 0.5;
export const STRIP_ZOMBIE_BOSS_SCALE = 0.62;
export const STRIP_STRUCTURE_SCALE = 0.44;

/** Bottom anchor Y so visible feet sit on `STRIP_GROUND_Y`. */
export function stripUnitAnchorY(scale: number, footTrimSource = STRIP_FOOT_TRIM_SOURCE_PX): number {
  return STRIP_GROUND_Y + footTrimSource * scale;
}

/** World Y of character feet given bottom-anchored sprite position. */
export function stripFeetYFromAnchor(anchorY: number, scale: number, footTrimSource = STRIP_FOOT_TRIM_SOURCE_PX): number {
  return anchorY - footTrimSource * scale;
}

export function stripFeetOnGround(anchorY: number, scale: number, groundY = STRIP_GROUND_Y): boolean {
  return Math.abs(stripFeetYFromAnchor(anchorY, scale) - groundY) < 0.25;
}

/** After hit-stop / knockback, anchor must match planted baseline (±bob). */
export function stripSettledAnchorY(
  baseAnchorY: number,
  knockbackDx: number,
  knockbackPhase: "none" | "out" | "return",
  locomotionDy: number,
): { x: number; y: number; settled: boolean } {
  const settled = knockbackPhase === "none";
  return {
    x: knockbackDx,
    y: baseAnchorY + locomotionDy,
    settled,
  };
}

export function stripLocomotionOffset(
  snap: StripCombatSnapshot | null,
  unitIndex: number,
  pose: "idle" | "walk" | "attack" | "hurt" | "die",
  isBoss = false,
): { dx: number; dy: number; scaleX: number; scaleY: number } {
  const march = snap?.march01 ?? 0;
  const phase = snap?.framePhase ?? 0;
  const t = march * Math.PI * 2 + unitIndex * 0.61;

  if (pose === "attack" || phase === 1) {
    const lunge = isBoss ? 2.5 : 3.5;
    return { dx: lunge, dy: -0.5, scaleX: 1.06, scaleY: 0.94 };
  }
  if (pose === "hurt" || pose === "die" || phase === 2) {
    return { dx: -1, dy: 0.5, scaleX: 0.96, scaleY: 1.02 };
  }
  if (pose === "walk") {
    const dy = Math.sin(t) * (isBoss ? 0.8 : 1.2);
    const dx = Math.cos(t * 0.5) * 0.6;
    return { dx, dy, scaleX: 1, scaleY: 1 + Math.sin(t + 1) * 0.03 };
  }
  return { dx: 0, dy: Math.sin(t * 0.7) * 0.4, scaleX: 1, scaleY: 1 };
}

export function stripMeleeLungeDx(role: SurvivorRoleId, attacking: boolean): number {
  if (!attacking) return 0;
  if (role === "brawler") return 4;
  if (role === "warden") return 3;
  return 2;
}

export function stripContactShadowMetrics(scale: number, isBoss: boolean): { width: number; height: number; alpha: number } {
  const base = 18 * scale;
  return {
    width: isBoss ? base * 1.45 : base,
    height: Math.max(2, base * 0.22),
    alpha: isBoss ? 0.42 : 0.36,
  };
}
