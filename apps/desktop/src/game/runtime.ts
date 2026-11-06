import {
  type BaseUpgradeId,
  type GameState,
  applyOfflineProgress,
  createInitialState,
  dispatch,
  loadFromJson,
  saveToJson,
  upgradeCost,
  type GameCommand,
  type StartWaveCommand,
  type UpgradeBaseCommand,
  type EquipGearCommand,
  type UnequipGearCommand,
  type SpendSkillCommand,
  type SetSurvivorRoleCommand,
  type SetSurvivorNameCommand,
  type SetStanceCommand,
  type SetTargetCommand,
  type WorkbenchEnhanceCommand,
  type WorkbenchRerollCommand,
  type SalvageGearCommand,
  type SynthesisCombineCommand,
  type AlchemyForgeCommand,
  type SetCampaignStageCommand,
  type BuyPerimeterNodeCommand,
} from "@zbd/sim";

const SAVE_KEY = "zbd_save_v1";

export type GameRuntime = {
  state: GameState;
  playerId: string;
  relayClientId: string | null;
  lastSaveMs: number;
  inCoopRoom: boolean;
  isCoopHost: boolean;
  assignedSurvivorId: string | null;
};

export function newRuntime(seed?: number): GameRuntime {
  const now = Date.now();
  return {
    state: createInitialState(seed ?? (now % 100000)),
    playerId: `local-${now}`,
    relayClientId: null,
    lastSaveMs: now,
    inCoopRoom: false,
    isCoopHost: false,
    assignedSurvivorId: null,
  };
}

export async function loadRuntime(): Promise<GameRuntime> {
  const now = Date.now();
  const raw = await readSaveRaw();
  if (!raw) return newRuntime();
  try {
    const { state, savedAtMs } = loadFromJson(raw);
    const withOffline = applyOfflineProgress(state, savedAtMs, now);
    return {
      state: withOffline,
      playerId: `local-${savedAtMs}`,
      relayClientId: null,
      lastSaveMs: now,
      inCoopRoom: false,
      isCoopHost: false,
      assignedSurvivorId: null,
    };
  } catch {
    return newRuntime();
  }
}

export async function persistRuntime(rt: GameRuntime): Promise<void> {
  const now = Date.now();
  const json = saveToJson(rt.state, now);
  await writeSaveRaw(json);
  rt.lastSaveMs = now;
}

async function readSaveRaw(): Promise<string | null> {
  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (tauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string | null>("read_save");
    } catch {
      /* fall through */
    }
  }
  return localStorage.getItem(SAVE_KEY);
}

async function writeSaveRaw(json: string): Promise<void> {
  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (tauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("write_save", { contents: json });
      return;
    } catch {
      /* fall through */
    }
  }
  localStorage.setItem(SAVE_KEY, json);
}

type StripMeta<T> = Omit<T, "id" | "playerId" | "issuedAtTick">;

export type CommandInput =
  | StripMeta<StartWaveCommand>
  | StripMeta<UpgradeBaseCommand>
  | StripMeta<EquipGearCommand>
  | StripMeta<UnequipGearCommand>
  | StripMeta<SpendSkillCommand>
  | StripMeta<SetSurvivorRoleCommand>
  | StripMeta<SetSurvivorNameCommand>
  | StripMeta<SetStanceCommand>
  | StripMeta<SetTargetCommand>
  | StripMeta<WorkbenchEnhanceCommand>
  | StripMeta<WorkbenchRerollCommand>
  | StripMeta<SalvageGearCommand>
  | StripMeta<SynthesisCombineCommand>
  | StripMeta<AlchemyForgeCommand>
  | StripMeta<SetCampaignStageCommand>
  | StripMeta<BuyPerimeterNodeCommand>;

export function issueCommand(rt: GameRuntime, partial: CommandInput): GameRuntime {
  const cmd = {
    ...partial,
    id: crypto.randomUUID(),
    playerId: rt.playerId,
    issuedAtTick: rt.state.tick,
  } as GameCommand;
  return { ...rt, state: dispatch(rt.state, cmd) };
}

export function upgradeLabel(id: BaseUpgradeId, state: GameState): string {
  const lvl = state.upgrades[id];
  const cost = upgradeCost(lvl);
  return `${id} L${lvl} (${cost}c)`;
}

export { BASE_UPGRADE_IDS } from "@zbd/sim";

export type { BaseUpgradeId };
