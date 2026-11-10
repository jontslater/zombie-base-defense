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
  const teamSpan = 128;
  return Math.min(30, Math.max(26, Math.floor(teamSpan / Math.max(1, survivorCount))));
}

/** Melee line: front zombie meets survivors near strip center (~x 195). */
export const STRIP_MELEE_CONTACT_X = 196;

export function stripZombieSlotX(
  slotIndex: number,
  visibleCount: number,
  isBoss: boolean,
): number {
  const frontX = isBoss ? STRIP_MELEE_CONTACT_X + 6 : STRIP_MELEE_CONTACT_X;
  const step = isBoss ? 30 : 28;
  const back = frontX + Math.max(0, visibleCount - 1 - slotIndex) * step;
  return Math.min(310, back);
}

export function stripSurvivorStartX(survivorCount: number): number {
  const spacing = stripSurvivorSpacingPx(survivorCount);
  const span = spacing * Math.max(0, survivorCount - 1);
  return Math.max(8, STRIP_MELEE_CONTACT_X - 24 - span);
}

export function stripUnitDisplayHeightPx(scale: number, frameSource = 64): number {
  return frameSource * scale;
}
