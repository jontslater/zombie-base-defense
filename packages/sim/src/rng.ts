/** Mulberry32 — fast deterministic PRNG from a 32-bit seed/state. */
export function mulberry32(state: number): { next: () => number; state: number } {
  let s = state >>> 0;
  return {
    get state() {
      return s;
    },
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function rollInt(rng: { next: () => number }, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

export function pickWeighted<T extends string>(
  rng: { next: () => number },
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng.next() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

import type { GameState } from "./types.js";

export function withRng<T>(state: GameState, fn: (rng: ReturnType<typeof mulberry32>) => T): {
  result: T;
  rngState: number;
} {
  const rng = mulberry32(state.rngState);
  const result = fn(rng);
  return { result, rngState: rng.state >>> 0 };
}
