import type { GemKind } from "./constants.js";
import type { SurvivorRoleId } from "./survivorRoles.js";
import type { ZombieKindId } from "./zombieKinds.js";

/** One of three strip poses synced to the combat rhythm (see `stripSnapshot.framePhase`). */
export type StripSurvivorFramePhase = "idle" | "attack" | "hurt";

/**
 * Atlas frame for a survivor row: gunner vs soldier appearance from index; brawler uses melee sheet.
 */
export function stripSurvivorSpriteKey(
  role: SurvivorRoleId,
  survivorIndex: number,
  phase: StripSurvivorFramePhase,
): string {
  const appearanceGunner = survivorIndex % 2 === 0;
  if (role === "brawler") {
    if (phase === "attack") return "survivor_melee_attack";
    if (phase === "hurt") return "survivor_melee_hurt";
    return "survivor_melee";
  }
  if (appearanceGunner) {
    if (phase === "attack") return "survivor_attack";
    if (phase === "hurt") return "survivor_hurt";
    return "survivor";
  }
  if (phase === "attack") return "survivor_alt_attack";
  if (phase === "hurt") return "survivor_alt_hurt";
  return "survivor_alt";
}

/** Walk / attack / die frames per zombie kind (walk is the marching pose). */
export function stripZombieSpriteKey(kind: ZombieKindId, phase: StripSurvivorFramePhase | "walk" | "die"): string {
  if (phase === "attack") return `${kind}_attack`;
  if (phase === "die") return `${kind}_die`;
  /** idle + walk + hurt (unused for zombies) → stand/walk frame */
  return kind;
}

/** Gem bag / socket UI: maps sim gem kinds to four-color atlas keys. */
export function gemSpriteKeyForKind(kind: GemKind): string {
  switch (kind) {
    case "ruby":
      return "gem_red";
    case "sapphire":
      return "gem_blue";
    case "topaz":
      return "gem_green";
    default:
      return "gem_purple";
  }
}
