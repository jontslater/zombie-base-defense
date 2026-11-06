import {
  campaignStageIsBoss,
  survivorSkillDamageMultiplier,
  weaponFlatBonus,
} from "@zbd/sim";
import type { GearItem, SurvivorState } from "@zbd/sim";

export function gearPowerForSurvivor(survivor: SurvivorState, currentStageKey = 0): number {
  const boss = campaignStageIsBoss(currentStageKey);
  let dmg = survivor.damage + weaponFlatBonus(survivor);
  return dmg * survivorSkillDamageMultiplier(survivor, { isBossWave: boss });
}

export function gearStatDelta(survivor: SurvivorState, item: GearItem, currentStageKey = 0): number {
  const before = gearPowerForSurvivor(survivor, currentStageKey);
  const hypothetical = {
    ...survivor,
    gear: { ...survivor.gear, [item.slot]: item },
  };
  return Math.round((gearPowerForSurvivor(hypothetical, currentStageKey) - before) * 10) / 10;
}
