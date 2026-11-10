import type { SurvivorRoleId } from "./survivorRoles.js";

export const STRIP_HIT_FEEL_FPS = 30;

export const STRIP_HIT_STOP_FRAMES = 5;
export const STRIP_KILL_HIT_STOP_FRAMES = 9;
export const STRIP_HIT_FLASH_FRAMES = 2;
export const STRIP_KNOCKBACK_PX = 7.8;
export const STRIP_KNOCKBACK_OUT_FRAMES = 8;
export const STRIP_KNOCKBACK_RETURN_FRAMES = 8;
export const STRIP_SCREEN_SHAKE_PX = 2;
export const STRIP_SCREEN_SHAKE_SETTLE_FRAMES = 10;
export const STRIP_BLOOD_PER_HIT = 10;
export const STRIP_BLOOD_GLOBAL_CAP = 48;
export const STRIP_IMPACT_SPARK_FRAMES = 4;
export const STRIP_DAMAGE_NUMBER_CAP = 8;
export const STRIP_TRAIL_MELEE_ROLES: SurvivorRoleId[] = ["brawler", "warden"];

export function isStripMeleeRole(role: SurvivorRoleId): boolean {
  return STRIP_TRAIL_MELEE_ROLES.includes(role);
}

export function bloodDropletSpawnCount(activeBlood: number, requested = STRIP_BLOOD_PER_HIT): number {
  const room = Math.max(0, STRIP_BLOOD_GLOBAL_CAP - activeBlood);
  return Math.min(requested, room);
}

export function shouldSpawnStripDamageNumber(activeFloating: number): boolean {
  return activeFloating < STRIP_DAMAGE_NUMBER_CAP;
}

/** Merge skip when crowded: same quantized column within tolerance. */
export function shouldMergeStripDamageNumber(
  activeFloating: number,
  existingColumns: number[],
  columnX: number,
  tolerancePx = 14,
): boolean {
  if (activeFloating < STRIP_DAMAGE_NUMBER_CAP) return false;
  return existingColumns.some((x) => Math.abs(x - columnX) <= tolerancePx);
}

export function knockbackEaseOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - (1 - c) * (1 - c);
}
