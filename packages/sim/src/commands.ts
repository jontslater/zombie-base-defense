import { BASE_UPGRADE_IDS, SKILL_COSTS, SKILL_PREREQS, WORKBENCH_ENHANCE_SCRAP, WORKBENCH_REROLL_CURRENCY, WORKBENCH_REROLL_SCRAP, RARITIES, RARITY_WEIGHTS, type Rarity } from "./constants.js";
import type { BaseUpgradeId, GearSlot, SkillNodeId, Stance, TargetMode } from "./constants.js";
import { pickWeighted, rollInt, withRng } from "./rng.js";
import { startWave } from "./waves.js";
import type { GameState } from "./types.js";

export type CommandBase = {
  id: string;
  playerId: string;
  issuedAtTick: number;
};

export type TickCommand = CommandBase & { type: "TICK"; count: number };

export type StartWaveCommand = CommandBase & { type: "START_WAVE" };

export type UpgradeBaseCommand = CommandBase & {
  type: "UPGRADE_BASE";
  upgradeId: BaseUpgradeId;
};

export type EquipGearCommand = CommandBase & {
  type: "EQUIP_GEAR";
  survivorId: string;
  inventoryIndex: number;
};

export type UnequipGearCommand = CommandBase & {
  type: "UNEQUIP_GEAR";
  survivorId: string;
  slot: GearSlot;
};

export type SpendSkillCommand = CommandBase & {
  type: "SPEND_SKILL";
  survivorId: string;
  nodeId: SkillNodeId;
};

export type SetSurvivorNameCommand = CommandBase & {
  type: "SET_SURVIVOR_NAME";
  survivorId: string;
  name: string;
};

export type SetStanceCommand = CommandBase & {
  type: "SET_STANCE";
  survivorId: string;
  stance: Stance;
};

export type SetTargetCommand = CommandBase & {
  type: "SET_TARGET";
  survivorId: string;
  target: TargetMode;
};

export type WorkbenchEnhanceCommand = CommandBase & {
  type: "WORKBENCH_ENHANCE";
  survivorId: string;
  slot?: GearSlot;
  inventoryIndex?: number;
};

export type WorkbenchRerollCommand = CommandBase & {
  type: "WORKBENCH_REROLL";
  inventoryIndex: number;
};

export type GameCommand =
  | TickCommand
  | StartWaveCommand
  | UpgradeBaseCommand
  | EquipGearCommand
  | UnequipGearCommand
  | SpendSkillCommand
  | SetSurvivorNameCommand
  | SetStanceCommand
  | SetTargetCommand
  | WorkbenchEnhanceCommand
  | WorkbenchRerollCommand;

export function upgradeCost(level: number): number {
  return Math.floor(25 * Math.pow(1.55, level));
}

export function applyCommand(state: GameState, cmd: GameCommand): GameState {
  switch (cmd.type) {
    case "TICK":
    case "START_WAVE":
      if (cmd.type === "START_WAVE") return startWave(state);
      return state;
    case "UPGRADE_BASE": {
      if (!BASE_UPGRADE_IDS.includes(cmd.upgradeId)) return state;
      const level = state.upgrades[cmd.upgradeId];
      const cost = upgradeCost(level);
      if (state.currency < cost) return state;
      const next = { ...state.upgrades, [cmd.upgradeId]: level + 1 };
      let baseCoreMaxHp = state.baseCoreMaxHp;
      if (cmd.upgradeId === "wall") baseCoreMaxHp += 50;
      return {
        ...state,
        currency: state.currency - cost,
        upgrades: next,
        baseCoreMaxHp,
        baseCoreHp: Math.min(
          state.baseCoreHp + (cmd.upgradeId === "wall" ? 50 : 0),
          baseCoreMaxHp,
        ),
      };
    }
    case "EQUIP_GEAR": {
      const item = state.inventory[cmd.inventoryIndex];
      if (!item) return state;
      const survivor = state.survivors.find((s) => s.id === cmd.survivorId);
      if (!survivor) return state;
      const inventory = state.inventory.filter((_, i) => i !== cmd.inventoryIndex);
      const old = survivor.gear[item.slot];
      if (old) inventory.push(old);
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId
          ? { ...s, gear: { ...s.gear, [item.slot]: item } }
          : s,
      );
      return { ...state, inventory, survivors };
    }
    case "UNEQUIP_GEAR": {
      const survivor = state.survivors.find((s) => s.id === cmd.survivorId);
      if (!survivor) return state;
      const item = survivor.gear[cmd.slot];
      if (!item) return state;
      const gear = { ...survivor.gear };
      delete gear[cmd.slot];
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId ? { ...s, gear } : s,
      );
      return { ...state, inventory: [...state.inventory, item], survivors };
    }
    case "SPEND_SKILL": {
      const survivor = state.survivors.find((s) => s.id === cmd.survivorId);
      if (!survivor) return state;
      if (survivor.skills[cmd.nodeId]) return state;
      const prereq = SKILL_PREREQS[cmd.nodeId];
      if (prereq && !survivor.skills[prereq]) return state;
      const cost = SKILL_COSTS[cmd.nodeId];
      if (survivor.skillPoints < cost) return state;
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId
          ? {
              ...s,
              skillPoints: s.skillPoints - cost,
              skills: { ...s.skills, [cmd.nodeId]: true },
            }
          : s,
      );
      return { ...state, survivors };
    }
    case "SET_SURVIVOR_NAME": {
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId ? { ...s, name: cmd.name.slice(0, 24) } : s,
      );
      return { ...state, survivors };
    }
    case "SET_STANCE": {
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId ? { ...s, stance: cmd.stance } : s,
      );
      return { ...state, survivors };
    }
    case "SET_TARGET": {
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId ? { ...s, target: cmd.target } : s,
      );
      return { ...state, survivors };
    }
    case "WORKBENCH_ENHANCE": {
      if (state.upgrades.workbench <= 0) return state;
      if (state.scrap < WORKBENCH_ENHANCE_SCRAP) return state;
      let inventory = [...state.inventory];
      const survivors = state.survivors.map((s) => {
        if (s.id !== cmd.survivorId) return s;
        if (cmd.inventoryIndex !== undefined) {
          const item = inventory[cmd.inventoryIndex];
          if (!item) return s;
          inventory = inventory.map((it, i) =>
            i === cmd.inventoryIndex ? { ...it, power: it.power + 1 + state.upgrades.workbench } : it,
          );
          return s;
        }
        const slot = cmd.slot ?? "weapon";
        const item = s.gear[slot];
        if (!item) return s;
        return {
          ...s,
          gear: {
            ...s.gear,
            [slot]: { ...item, power: item.power + 1 + state.upgrades.workbench },
          },
        };
      });
      return { ...state, scrap: state.scrap - WORKBENCH_ENHANCE_SCRAP, inventory, survivors };
    }
    case "WORKBENCH_REROLL": {
      if (state.upgrades.workbench <= 0) return state;
      if (state.scrap < WORKBENCH_REROLL_SCRAP || state.currency < WORKBENCH_REROLL_CURRENCY) {
        return state;
      }
      const item = state.inventory[cmd.inventoryIndex];
      if (!item) return state;
      const { result, rngState } = withRng(state, (rng) => {
        const rarity = pickWeighted(rng, RARITY_WEIGHTS) as Rarity;
        const rarityIndex = RARITIES.indexOf(rarity);
        const power = Math.floor(item.power * (0.85 + rarityIndex * 0.08) + rollInt(rng, 1, 4));
        return { ...item, rarity, power: Math.max(1, power) };
      });
      if (!result) return state;
      const inventory = state.inventory.map((it, i) => (i === cmd.inventoryIndex ? result : it));
      return {
        ...state,
        scrap: state.scrap - WORKBENCH_REROLL_SCRAP,
        currency: state.currency - WORKBENCH_REROLL_CURRENCY,
        inventory,
        rngState,
      };
    }
  }
}
