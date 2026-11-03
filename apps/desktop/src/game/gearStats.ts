import type { GearItem, SurvivorState } from "@zbd/sim";

export function gearPowerForSurvivor(survivor: SurvivorState): number {
  const weapon = survivor.gear.weapon;
  let dmg = survivor.damage;
  if (survivor.skills.damage_1) dmg *= 1.1;
  if (survivor.skills.damage_2) dmg *= 1.15;
  if (weapon) dmg += weapon.power * 0.5;
  return dmg;
}

export function gearStatDelta(survivor: SurvivorState, item: GearItem): number {
  const before = gearPowerForSurvivor(survivor);
  const hypothetical = {
    ...survivor,
    gear: { ...survivor.gear, [item.slot]: item },
  };
  return Math.round((gearPowerForSurvivor(hypothetical) - before) * 10) / 10;
}
