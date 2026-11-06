import { campaignStageIsBoss } from "./campaign.js";
import type { GameState, SurvivorState } from "./types.js";

/** Extra flat damage from weapon gear + gems + affixes (added before stance mult). */
export function weaponFlatBonus(survivor: SurvivorState): number {
  const w = survivor.gear.weapon;
  if (!w) return 0;
  let bonus = w.power * 0.5;
  for (const sock of w.sockets) {
    if (sock?.kind === "ruby") bonus += sock.tier * 0.4;
  }
  for (const a of w.affixes) {
    if (a.id === "sharp") bonus += a.value * 0.15;
  }
  return bonus;
}

export function armorHpBonus(survivor: SurvivorState): number {
  const a = survivor.gear.armor;
  if (!a) return 0;
  let bonus = a.power;
  for (const sock of a.sockets) {
    if (sock?.kind === "sapphire") bonus += sock.tier * 3;
  }
  for (const af of a.affixes) {
    if (af.id === "reinforced") bonus += af.value * 0.5;
  }
  return bonus;
}

export function hunterDamageMultiplier(survivor: SurvivorState, state: GameState): number {
  const boss = campaignStageIsBoss(state.currentStageKey);
  let mult = 1;
  for (const g of Object.values(survivor.gear)) {
    if (!g) continue;
    for (const a of g.affixes) {
      if (a.id === "hunter" && boss) mult *= 1 + a.value / 500;
    }
  }
  return mult;
}

export function scrapBonusOnKillFromGear(survivor: SurvivorState): number {
  let extra = 0;
  for (const g of Object.values(survivor.gear)) {
    if (!g) continue;
    for (const sock of g.sockets) {
      if (sock?.kind === "topaz") extra += Math.max(0, Math.floor(sock.tier / 3));
    }
    for (const a of g.affixes) {
      if (a.id === "salvager") extra += Math.max(0, Math.floor(a.value / 100));
    }
  }
  return extra;
}

/** Aggregate hunter mult across party (multiplicative for simplicity). */
export function partyHunterMultiplier(state: GameState): number {
  return state.survivors.reduce((m, s) => m * hunterDamageMultiplier(s, state), 1);
}

export function partyScrapBonusPerKill(state: GameState): number {
  return state.survivors.reduce((sum, s) => sum + scrapBonusOnKillFromGear(s), 0);
}
