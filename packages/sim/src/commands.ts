import {
  CAMPAIGN_NUM_ACTS,
  CAMPAIGN_NUM_DIFFICULTY_TIERS,
  CAMPAIGN_STAGES_PER_ACT,
  campaignWaveNumberFromStageKey,
  stageKeyFromParts,
} from "./campaign.js";
import {
  ALCHEMY_FORGE_CURRENCY,
  ALCHEMY_FORGE_MATERIALS,
  ALCHEMY_FORGE_SCRAP,
  BASE_UPGRADE_IDS,
  GEM_COMBINE_INPUT_COUNT,
  GEAR_SLOTS,
  RARITIES,
  RARITY_WEIGHTS,
  SOCKET_FORGE_MATERIALS,
  SOCKET_FORGE_SCRAP,
  SYNTHESIS_INPUT_COUNT,
  SYNTHESIS_SCRAP_COST,
  WORKBENCH_ENHANCE_SCRAP,
  WORKBENCH_REROLL_CURRENCY,
  WORKBENCH_REROLL_SCRAP,
  REBORN_MIN_WAVE,
  rebornStartingCurrency,
  upgradeCostAtLevel,
  type PerimeterNodeId,
  type Rarity,
} from "./constants.js";
import type { BaseUpgradeId, GearSlot, Stance, TargetMode } from "./constants.js";
import {
  SURVIVOR_ROLE_IDS,
  SKILL_NODE_IDS,
  canSpendSkill,
  type SkillNodeId,
  type SurvivorRoleId,
} from "./survivorRoles.js";
import { makeGearItem, makeGemItem } from "./gearFactory.js";
import { maxSocketsForRarity, sanitizeGearItem } from "./gearModel.js";
import { pickWeighted, rollInt, withRng } from "./rng.js";
import { createInitialState } from "./save.js";
import { perimeterSecondForgeUnlocked, tryBuyPerimeterNode } from "./perimeter.js";
import { startWave } from "./waves.js";
import {
  addMaterials,
  materialsCanAfford,
  subtractMaterials,
  salvageYieldForGear,
} from "./workbenchMaterials.js";
import type { GameState, GearItem, GemItem } from "./types.js";

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

export type SetSurvivorRoleCommand = CommandBase & {
  type: "SET_SURVIVOR_ROLE";
  survivorId: string;
  role: SurvivorRoleId;
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

export type RebornCommand = CommandBase & { type: "REBORN" };

export type SalvageGearCommand = CommandBase & {
  type: "SALVAGE_GEAR";
  inventoryIndex: number;
};

export type SynthesisCombineCommand = CommandBase & {
  type: "SYNTHESIS_COMBINE";
  inventoryIndices: number[];
};

export type AlchemyForgeCommand = CommandBase & {
  type: "ALCHEMY_FORGE";
  slot: GearSlot;
};

export type SetCampaignStageCommand = CommandBase & {
  type: "SET_CAMPAIGN_STAGE";
  /** Difficulty tier 0..3 */
  tier: number;
  /** Act 0..2 */
  act: number;
  /** Stage 1..10 */
  stage: number;
};

export type BuyPerimeterNodeCommand = CommandBase & {
  type: "BUY_PERIMETER_NODE";
  nodeId: PerimeterNodeId;
};

export type SocketForgeCommand = CommandBase & {
  type: "SOCKET_FORGE";
  /** Unlock one socket on this inventory piece. */
  inventoryIndex: number;
};

export type GemCombineCommand = CommandBase & {
  type: "GEM_COMBINE";
  gemInventoryIndices: number[];
};

export type SocketGemCommand = CommandBase & {
  type: "SOCKET_GEM";
  gemInventoryIndex: number;
  socketIndex: number;
  /** Equip target — exactly one of (survivorId+equipSlot) or inventoryGearIndex. */
  survivorId?: string;
  equipSlot?: GearSlot;
  inventoryGearIndex?: number;
};

export type UnsocketGemCommand = CommandBase & {
  type: "UNSOCKET_GEM";
  socketIndex: number;
  survivorId?: string;
  equipSlot?: GearSlot;
  inventoryGearIndex?: number;
};

export type GameCommand =
  | TickCommand
  | StartWaveCommand
  | UpgradeBaseCommand
  | EquipGearCommand
  | UnequipGearCommand
  | SpendSkillCommand
  | SetSurvivorRoleCommand
  | SetSurvivorNameCommand
  | SetStanceCommand
  | SetTargetCommand
  | WorkbenchEnhanceCommand
  | WorkbenchRerollCommand
  | RebornCommand
  | SalvageGearCommand
  | SynthesisCombineCommand
  | AlchemyForgeCommand
  | SetCampaignStageCommand
  | BuyPerimeterNodeCommand
  | SocketForgeCommand
  | GemCombineCommand
  | SocketGemCommand
  | UnsocketGemCommand;

/** @deprecated Prefer `upgradeCostAtLevel` from constants. */
export function upgradeCost(level: number): number {
  return upgradeCostAtLevel(level);
}

export function applyReborn(state: GameState): GameState {
  if (state.combat !== null) return state;
  /** Best encounter wave reached this run (core-fall can lower `wave` while `campaignHighestClearedKey` stays ahead). */
  const progressWave =
    state.campaignHighestClearedKey < 0
      ? state.wave
      : Math.max(state.wave, campaignWaveNumberFromStageKey(state.campaignHighestClearedKey));
  if (progressWave < REBORN_MIN_WAVE) return state;
  const fresh = createInitialState(state.rngState);
  const payout = rebornStartingCurrency(progressWave);
  return {
    ...fresh,
    rebornCount: state.rebornCount + 1,
    lifetimeCurrencyEarned: state.lifetimeCurrencyEarned + payout,
    currency: payout,
    perimeterUnlocked: { ...state.perimeterUnlocked },
  };
}

function applySetCampaignStage(
  state: GameState,
  tier: number,
  act: number,
  stage: number,
): GameState {
  if (state.combat !== null) return state;
  const high = state.campaignHighestClearedKey;
  if (high < 0) return state;

  if (!Number.isFinite(tier) || !Number.isFinite(act) || !Number.isFinite(stage)) return state;
  const t = Math.floor(tier);
  const a = Math.floor(act);
  const st = Math.floor(stage);
  if (t < 0 || t >= CAMPAIGN_NUM_DIFFICULTY_TIERS) return state;
  if (a < 0 || a >= CAMPAIGN_NUM_ACTS) return state;
  if (st < 1 || st > CAMPAIGN_STAGES_PER_ACT) return state;

  const key = stageKeyFromParts(t, a, st);
  if (key > high) return state;

  const wave = campaignWaveNumberFromStageKey(key);
  return { ...state, currentStageKey: key, wave };
}

function mapInventoryGear(
  state: GameState,
  index: number,
  fn: (g: GearItem) => GearItem,
): GameState {
  const it = state.inventory[index];
  if (!it) return state;
  const next = fn(it);
  const inventory = state.inventory.map((g, i) => (i === index ? next : g));
  return { ...state, inventory };
}

function mapEquippedGear(
  state: GameState,
  survivorId: string,
  slot: GearSlot,
  fn: (g: GearItem) => GearItem,
): GameState {
  const survivors = state.survivors.map((s) => {
    if (s.id !== survivorId) return s;
    const it = s.gear[slot];
    if (!it) return s;
    return { ...s, gear: { ...s.gear, [slot]: fn(it) } };
  });
  return { ...state, survivors };
}

export function applyCommand(state: GameState, cmd: GameCommand): GameState {
  switch (cmd.type) {
    case "REBORN":
      return applyReborn(state);
    case "SET_CAMPAIGN_STAGE":
      return applySetCampaignStage(state, cmd.tier, cmd.act, cmd.stage);
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
      const rawItem = state.inventory[cmd.inventoryIndex];
      if (!rawItem) return state;
      const item = sanitizeGearItem(rawItem);
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
      if (!SKILL_NODE_IDS.includes(cmd.nodeId as SkillNodeId)) return state;
      const nodeId = cmd.nodeId as SkillNodeId;
      const { ok, cost } = canSpendSkill(survivor, nodeId);
      if (!ok) return state;
      const survivors = state.survivors.map((s) => {
        if (s.id !== cmd.survivorId) return s;
        const prev = typeof s.skills[nodeId] === "number" ? (s.skills[nodeId] as number) : 0;
        return {
          ...s,
          skillPoints: s.skillPoints - cost,
          skills: { ...s.skills, [nodeId]: prev + 1 },
        };
      });
      return { ...state, survivors };
    }
    case "SET_SURVIVOR_ROLE": {
      if (!SURVIVOR_ROLE_IDS.includes(cmd.role)) return state;
      const survivors = state.survivors.map((s) =>
        s.id === cmd.survivorId ? { ...s, role: cmd.role } : s,
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
      const { result: rerollPayload, rngState } = withRng(state, (rng) => {
        const rarity = pickWeighted(rng, RARITY_WEIGHTS) as Rarity;
        const rarityIndex = RARITIES.indexOf(rarity);
        const power = Math.floor(item.power * (0.85 + rarityIndex * 0.08) + rollInt(rng, 1, 4));
        const base = makeGearItem({
          id: item.id,
          slot: item.slot,
          rarity,
          power: Math.max(1, power),
          rng,
        });
        const maxN = maxSocketsForRarity(rarity);
        const returned: GemItem[] = [];
        const sockets: (GemItem | null)[] = [];
        for (let i = 0; i < maxN; i++) {
          const g = item.sockets[i] ?? null;
          sockets.push(g);
        }
        for (let i = maxN; i < item.sockets.length; i++) {
          const g = item.sockets[i];
          if (g) returned.push(g);
        }
        return {
          gear: sanitizeGearItem({ ...base, sockets }),
          gemsReturned: returned,
        };
      });
      const rerolled = rerollPayload?.gear;
      const gemsReturned = rerollPayload?.gemsReturned ?? [];
      if (!rerolled) return state;
      const inventory = state.inventory.map((it, i) => (i === cmd.inventoryIndex ? rerolled : it));
      return {
        ...state,
        scrap: state.scrap - WORKBENCH_REROLL_SCRAP,
        currency: state.currency - WORKBENCH_REROLL_CURRENCY,
        inventory,
        gemInventory: [...state.gemInventory, ...gemsReturned],
        rngState,
      };
    }
    case "SALVAGE_GEAR": {
      if (state.upgrades.workbench <= 0) return state;
      const item = state.inventory[cmd.inventoryIndex];
      if (!item) return state;
      const yieldMap = salvageYieldForGear(item);
      const inventory = state.inventory.filter((_, i) => i !== cmd.inventoryIndex);
      const gemsFromSockets = item.sockets.filter((g): g is GemItem => g !== null);
      return {
        ...state,
        inventory,
        materials: addMaterials(state, yieldMap),
        gemInventory: [...state.gemInventory, ...gemsFromSockets],
      };
    }
    case "SYNTHESIS_COMBINE": {
      if (state.upgrades.workbench <= 0) return state;
      if (state.scrap < SYNTHESIS_SCRAP_COST) return state;
      const idxs = [...cmd.inventoryIndices];
      if (idxs.length !== SYNTHESIS_INPUT_COUNT) return state;
      const uniq = new Set(idxs);
      if (uniq.size !== SYNTHESIS_INPUT_COUNT) return state;
      if (idxs.some((i) => i < 0 || i >= state.inventory.length)) return state;
      const items = idxs.map((i) => state.inventory[i]!);
      const gemsFromSockets: GemItem[] = [];
      for (const it of items) {
        for (const g of it.sockets) {
          if (g) gemsFromSockets.push(g);
        }
      }
      const rarity = items[0]!.rarity;
      if (items.some((it) => it.rarity !== rarity)) return state;
      const ri = RARITIES.indexOf(rarity);
      if (ri < 0 || ri >= RARITIES.length - 1) return state;
      const nextRarity = RARITIES[ri + 1]!;

      const sortedDesc = [...idxs].sort((a, b) => b - a);
      let inventory = [...state.inventory];
      for (const removeAt of sortedDesc) {
        inventory.splice(removeAt, 1);
      }

      const encounterWave = campaignWaveNumberFromStageKey(state.currentStageKey);
      const { result: newItem, rngState } = withRng(state, (rng) => {
        const slotRoll = rollInt(rng, 0, 3);
        const slots = ["weapon", "armor", "tool", "trinket"] as const;
        const slot = slots[slotRoll]!;
        const rarityIndex = RARITIES.indexOf(nextRarity);
        const power = Math.floor(
          (5 + encounterWave * 0.5) * (1 + rarityIndex * 0.35) + rollInt(rng, 1, 4),
        );
        const id = `syn-${state.tick}-${rollInt(rng, 1000, 9999)}`;
        return makeGearItem({
          id,
          slot,
          rarity: nextRarity,
          power: Math.max(1, power),
          rng,
        });
      });
      if (!newItem) return state;

      return {
        ...state,
        inventory: [...inventory, sanitizeGearItem(newItem)],
        gemInventory: [...state.gemInventory, ...gemsFromSockets],
        scrap: state.scrap - SYNTHESIS_SCRAP_COST,
        rngState,
      };
    }
    case "ALCHEMY_FORGE": {
      if (state.upgrades.workbench <= 0) return state;
      if (!GEAR_SLOTS.includes(cmd.slot)) return state;
      const forgeCurrencyCost = perimeterSecondForgeUnlocked(state)
        ? Math.max(1, ALCHEMY_FORGE_CURRENCY - 5)
        : ALCHEMY_FORGE_CURRENCY;
      if (
        state.scrap < ALCHEMY_FORGE_SCRAP ||
        state.currency < forgeCurrencyCost ||
        !materialsCanAfford(state, ALCHEMY_FORGE_MATERIALS)
      ) {
        return state;
      }
      const encounterWave = campaignWaveNumberFromStageKey(state.currentStageKey);
      const { result, rngState } = withRng(state, (rng) => {
        const rarity = pickWeighted(rng, RARITY_WEIGHTS) as Rarity;
        const rarityIndex = RARITIES.indexOf(rarity);
        const power = Math.floor(
          (5 + encounterWave * 0.5) * (1 + rarityIndex * 0.35) + rollInt(rng, 1, 4),
        );
        const id = `forge-${state.tick}-${rollInt(rng, 1000, 9999)}`;
        return makeGearItem({
          id,
          slot: cmd.slot,
          rarity,
          power: Math.max(1, power),
          rng,
        });
      });
      if (!result) return state;
      const forged = sanitizeGearItem(result);
      return {
        ...state,
        scrap: state.scrap - ALCHEMY_FORGE_SCRAP,
        currency: state.currency - forgeCurrencyCost,
        materials: subtractMaterials(state, ALCHEMY_FORGE_MATERIALS),
        inventory: [...state.inventory, forged],
        rngState,
      };
    }
    case "SOCKET_FORGE": {
      if (state.upgrades.workbench <= 0) return state;
      if (state.scrap < SOCKET_FORGE_SCRAP || !materialsCanAfford(state, SOCKET_FORGE_MATERIALS)) {
        return state;
      }
      const item = state.inventory[cmd.inventoryIndex];
      if (!item) return state;
      const maxSoc = maxSocketsForRarity(item.rarity);
      if (item.sockets.length >= maxSoc) return state;
      return mapInventoryGear(
        {
          ...state,
          scrap: state.scrap - SOCKET_FORGE_SCRAP,
          materials: subtractMaterials(state, SOCKET_FORGE_MATERIALS),
        },
        cmd.inventoryIndex,
        (g) => sanitizeGearItem({ ...g, sockets: [...g.sockets, null] }),
      );
    }
    case "GEM_COMBINE": {
      if (state.upgrades.workbench <= 0) return state;
      const idxs = [...cmd.gemInventoryIndices];
      if (idxs.length !== GEM_COMBINE_INPUT_COUNT) return state;
      if (new Set(idxs).size !== GEM_COMBINE_INPUT_COUNT) return state;
      if (idxs.some((i) => i < 0 || i >= state.gemInventory.length)) return state;
      const gems = idxs.map((i) => state.gemInventory[i]!);
      const k0 = gems[0]!.kind;
      const t0 = gems[0]!.tier;
      if (gems.some((g) => g.kind !== k0 || g.tier !== t0)) return state;
      if (t0 >= 9) return state;
      const sortedDesc = [...idxs].sort((a, b) => b - a);
      let gemInventory = [...state.gemInventory];
      for (const r of sortedDesc) gemInventory.splice(r, 1);
      const { result, rngState } = withRng(state, (rng) =>
        makeGemItem({
          id: `gemc-${state.tick}-${rollInt(rng, 1000, 9999)}`,
          kind: k0,
          tier: t0 + 1,
        }),
      );
      if (!result) return state;
      return {
        ...state,
        gemInventory: [...gemInventory, result],
        rngState,
      };
    }
    case "SOCKET_GEM": {
      if (state.upgrades.workbench <= 0) return state;
      const gem = state.gemInventory[cmd.gemInventoryIndex];
      if (!gem) return state;
      const idxGem = cmd.gemInventoryIndex;

      const applyTo = (gear: GearItem): GearItem | null => {
        const si = cmd.socketIndex;
        if (si < 0 || si >= gear.sockets.length) return null;
        if (gear.sockets[si]) return null;
        const sockets = [...gear.sockets];
        sockets[si] = gem;
        return sanitizeGearItem({ ...gear, sockets });
      };

      let next: GameState = { ...state };
      if (cmd.inventoryGearIndex !== undefined) {
        const g = state.inventory[cmd.inventoryGearIndex];
        if (!g) return state;
        const updated = applyTo(g);
        if (!updated) return state;
        next = mapInventoryGear(next, cmd.inventoryGearIndex, () => updated);
      } else if (cmd.survivorId !== undefined && cmd.equipSlot !== undefined) {
        const s = state.survivors.find((x) => x.id === cmd.survivorId);
        const g = s?.gear[cmd.equipSlot];
        if (!g) return state;
        const updated = applyTo(g);
        if (!updated) return state;
        next = mapEquippedGear(next, cmd.survivorId, cmd.equipSlot, () => updated);
      } else {
        return state;
      }

      next = {
        ...next,
        gemInventory: next.gemInventory.filter((_, i) => i !== idxGem),
      };
      return next;
    }
    case "UNSOCKET_GEM": {
      if (state.upgrades.workbench <= 0) return state;
      const si = cmd.socketIndex;
      const pull = (gear: GearItem): { gear: GearItem; gem: GemItem } | null => {
        if (si < 0 || si >= gear.sockets.length) return null;
        const g = gear.sockets[si];
        if (!g) return null;
        const sockets = [...gear.sockets];
        sockets[si] = null;
        return { gear: sanitizeGearItem({ ...gear, sockets }), gem: g };
      };

      if (cmd.inventoryGearIndex !== undefined) {
        const g = state.inventory[cmd.inventoryGearIndex];
        if (!g) return state;
        const out = pull(g);
        if (!out) return state;
        return mapInventoryGear(
          { ...state, gemInventory: [...state.gemInventory, out.gem] },
          cmd.inventoryGearIndex,
          () => out.gear,
        );
      }
      if (cmd.survivorId !== undefined && cmd.equipSlot !== undefined) {
        const s = state.survivors.find((x) => x.id === cmd.survivorId);
        const g = s?.gear[cmd.equipSlot];
        if (!g) return state;
        const out = pull(g);
        if (!out) return state;
        return mapEquippedGear(
          { ...state, gemInventory: [...state.gemInventory, out.gem] },
          cmd.survivorId,
          cmd.equipSlot,
          () => out.gear,
        );
      }
      return state;
    }
    case "BUY_PERIMETER_NODE": {
      const result = tryBuyPerimeterNode(state, cmd.nodeId);
      return result.ok ? result.state : state;
    }
  }
}
