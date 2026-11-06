import type { GemKind } from "./constants.js";
import type { SurvivorRoleId } from "./survivorRoles.js";
import type { ZombieKindId } from "./zombieKinds.js";

/** One of three strip poses synced to the combat rhythm (see `stripSnapshot.framePhase`). */
export type StripSurvivorFramePhase = "idle" | "attack" | "hurt";

/** Strip atlas keys for each TBH-style role (`survivor_<role>` + attack/hurt suffixes; idle omits suffix). */
const ROLE_STRIP_ATLAS_PREFIX: Record<SurvivorRoleId, `survivor_${SurvivorRoleId}`> = {
  brawler: "survivor_brawler",
  medic: "survivor_medic",
  engineer: "survivor_engineer",
  hunter: "survivor_hunter",
  spotter: "survivor_spotter",
  warden: "survivor_warden",
};

/** Atlas frame for a survivor row: per-role strip art (`survivor_<role>` idle/attack/hurt). */
export function stripSurvivorSpriteKey(
  role: SurvivorRoleId,
  _survivorIndex: number,
  phase: StripSurvivorFramePhase,
): string {
  const base = ROLE_STRIP_ATLAS_PREFIX[role];
  if (phase === "attack") return `${base}_attack`;
  if (phase === "hurt") return `${base}_hurt`;
  return base;
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
