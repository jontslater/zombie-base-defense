/** Render-only caps for TBH-style strip readability. */
export const STRIP_MAX_VISIBLE_ZOMBIES = 4;
export const STRIP_MAX_VISIBLE_ZOMBIES_BOSS = 3;
export const STRIP_MAX_HORDE_SILHOUETTES = 2;

export function stripHordePresentation(
  zombiesRemaining: number,
  isBoss: boolean,
): { visibleSlots: number; overflow: number; silhouettes: number } {
  const cap = isBoss ? STRIP_MAX_VISIBLE_ZOMBIES_BOSS : STRIP_MAX_VISIBLE_ZOMBIES;
  const visibleSlots = Math.min(Math.max(0, zombiesRemaining), cap);
  const overflow = Math.max(0, zombiesRemaining - visibleSlots);
  const silhouettes =
    overflow > 0 ? Math.min(STRIP_MAX_HORDE_SILHOUETTES, overflow) : 0;
  return { visibleSlots, overflow, silhouettes };
}

export function stripSurvivorSpacingPx(survivorCount: number): number {
  const teamSpan = 158;
  return Math.min(36, Math.max(28, Math.floor(teamSpan / Math.max(1, survivorCount))));
}

/** Fixed X slots for visible zombies (front = index 0 toward heroes). */
export function stripZombieSlotX(
  slotIndex: number,
  visibleCount: number,
  isBoss: boolean,
): number {
  const frontX = isBoss ? 268 : 248;
  const step = isBoss ? 34 : 32;
  const back = frontX + Math.max(0, visibleCount - 1 - slotIndex) * step;
  return Math.min(340, back);
}

export function stripUnitDisplayHeightPx(scale: number, frameSource = 64): number {
  return frameSource * scale;
}
