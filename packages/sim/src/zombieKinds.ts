/**
 * Lightweight zombie archetypes for kill tracking (companions unlock by kind).
 * Kind is assigned deterministically from wave context and spawn index — no extra RNG.
 */
export const ZOMBIE_KIND_IDS = [
  "shambler",
  "runner",
  "spitter",
  "brute",
  "crowd",
  "boss",
] as const;

export type ZombieKindId = (typeof ZOMBIE_KIND_IDS)[number];

export type ZombieKillsByKind = Partial<Record<ZombieKindId, number>>;

export function emptyZombieKillsByKind(): ZombieKillsByKind {
  return Object.fromEntries(ZOMBIE_KIND_IDS.map((k) => [k, 0])) as Record<ZombieKindId, number>;
}

/**
 * `spawnIndex` is 0-based: how many zombies had started this wave (including the one just killed).
 */
export function zombieKindForKill(params: {
  encounterWave: number;
  isBoss: boolean;
  zombiesMax: number;
  spawnIndex: number;
}): ZombieKindId {
  const { encounterWave, isBoss, zombiesMax, spawnIndex } = params;
  const lastIndex = zombiesMax - 1;
  if (isBoss && spawnIndex === lastIndex) {
    return "boss";
  }
  if (isBoss) {
    const mix = (encounterWave * 7 + spawnIndex) % 3;
    return (["runner", "brute", "spitter"] as const)[mix]!;
  }
  const mix = (encounterWave * 11 + spawnIndex * 5) % 5;
  return (["shambler", "crowd", "runner", "spitter", "brute"] as const)[mix]!;
}
