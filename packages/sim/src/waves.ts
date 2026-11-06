import {
  campaignStageIsBoss,
  campaignWaveNumberFromStageKey,
} from "./campaign.js";
import {
  BOSS_EVERY_N_WAVES,
  RARITIES,
  RARITY_WEIGHTS,
  WAVE_HP_DAMAGE_SCALE_PER_WAVE,
  rebornDpsMultiplier,
  type Rarity,
} from "./constants.js";
import { stanceDamageMultiplier, targetFocusMultiplier } from "./coop.js";
import {
  perimeterLootDropChanceAdd,
  perimeterRarityBandShiftMult,
  perimeterSurvivorDpsMult,
} from "./perimeter.js";
import { pickWeighted, rollInt, withRng } from "./rng.js";
import type { GameState, GearItem, WaveCombat } from "./types.js";

export function waveIsBoss(wave: number): boolean {
  return wave > 0 && wave % BOSS_EVERY_N_WAVES === 0;
}

/** Zombie count and stats scale with wave number. */
export function buildWaveCombat(wave: number): WaveCombat {
  const isBoss = waveIsBoss(wave);
  const baseCount = 3 + Math.floor(wave * 0.8);
  const zombiesMax = isBoss ? Math.max(1, Math.floor(baseCount * 0.4)) : baseCount;
  const scale = 1 + (wave - 1) * WAVE_HP_DAMAGE_SCALE_PER_WAVE;
  const zombieHp = Math.floor(25 * scale * (isBoss ? 8 : 1));
  const zombieDamage = Math.floor(4 * scale * (isBoss ? 2 : 1));
  return {
    zombiesRemaining: zombiesMax,
    zombiesMax,
    zombieHp,
    zombieDamage,
    isBoss,
    bossHpMultiplier: isBoss ? 8 : 1,
  };
}

export function startWave(state: GameState): GameState {
  if (state.combat) return state;
  const encounterWave = campaignWaveNumberFromStageKey(state.currentStageKey);
  const combat = buildWaveCombat(encounterWave);
  return { ...state, combat };
}

export function survivorDps(state: GameState): number {
  const dpsMult = rebornDpsMultiplier(state.rebornCount);
  const turretLevel = state.upgrades.turret;
  const turretBonus = turretLevel * 2;
  const bossWave = campaignStageIsBoss(state.currentStageKey);
  const fromSurvivors = state.survivors.reduce((sum, s) => {
    let dmg = s.damage;
    if (s.skills.damage_1) dmg *= 1.1;
    if (s.skills.damage_2) dmg *= 1.15;
    const weapon = s.gear.weapon;
    if (weapon) dmg += weapon.power * 0.5;
    dmg *= stanceDamageMultiplier(s.stance);
    dmg *= targetFocusMultiplier(s.target, bossWave);
    return sum + dmg;
  }, 0);
  return (fromSurvivors + turretBonus) * dpsMult * perimeterSurvivorDpsMult(state);
}

export function survivorEffectiveHp(state: GameState): number {
  return state.survivors.reduce((sum, s) => {
    let max = s.maxHp;
    if (s.skills.hp_1) max *= 1.2;
    const armor = s.gear.armor;
    if (armor) max += armor.power;
    return sum + Math.min(s.hp, max);
  }, 0);
}

export function rollLoot(state: GameState, wave: number): { state: GameState; item: GearItem | null } {
  const lootBonus =
    state.upgrades.workbench * 0.02 +
    state.survivors.reduce((b, s) => (s.skills.loot_1 ? b + 0.05 : b), 0);

  const { result, rngState } = withRng(state, (rng) => {
    const dropChance = Math.min(
      0.65,
      0.15 + wave * 0.008 + lootBonus + perimeterLootDropChanceAdd(state),
    );
    if (rng.next() > dropChance) return null;

    const weights = { ...RARITY_WEIGHTS };
    const bandShift = perimeterRarityBandShiftMult(state);
    for (const r of RARITIES) {
      if (r !== "Common") weights[r] = Math.floor(weights[r] * bandShift);
    }
    if (wave >= 20) weights.Apocalyptic = weights.Apocalyptic * 2;
    if (wave >= 10) weights.Mythic = weights.Mythic * 1.5;

    const rarity = pickWeighted(rng, weights);
    const slotRoll = rollInt(rng, 0, 3);
    const slots = ["weapon", "armor", "tool", "trinket"] as const;
    const slot = slots[slotRoll]!;
    const rarityIndex = RARITIES.indexOf(rarity as Rarity);
    const power = Math.floor((5 + wave * 0.5) * (1 + rarityIndex * 0.35));
    const id = `loot-${state.tick}-${rollInt(rng, 1000, 9999)}`;
    return { id, slot, rarity: rarity as Rarity, power } satisfies GearItem;
  });

  return {
    state: { ...state, rngState },
    item: result,
  };
}

export function scaleLootForTests(wave: number): { minPower: number; maxPower: number } {
  const scale = 1 + (wave - 1) * 0.12;
  return { minPower: Math.floor(5 * scale), maxPower: Math.floor(50 * scale * 8) };
}
