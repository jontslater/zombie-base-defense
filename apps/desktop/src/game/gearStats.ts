import { campaignStageIsBoss, survivorSkillDamageMultiplier } from "@zbd/sim";
import type { GearItem, SurvivorState } from "@zbd/sim";

export function gearPowerForSurvivor(survivor: SurvivorState, currentStageKey = 0): number {
  const weapon = survivor.gear.weapon;
  let dmg = survivor.damage;
  if (weapon) dmg += weapon.power * 0.5;
  const boss = campaignStageIsBoss(currentStageKey);
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
