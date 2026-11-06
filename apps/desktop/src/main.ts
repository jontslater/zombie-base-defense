import { createPhaserGame, getStripScene } from "./game/stripScene";
import {
  BASE_UPGRADE_IDS,
  loadRuntime,
  persistRuntime,
  upgradeLabel,
  type GameRuntime,
  type BaseUpgradeId,
  type CommandInput,
} from "./game/runtime";
import { RelayClient } from "./net/relayClient";
import { simTick } from "@zbd/sim";
import { loadAppConfig } from "./config";
import {
  applyGuestDelta,
  applyHostGuestCommand,
  applyLocalCommand,
  assignGuestSurvivor,
  buildHostDelta,
  createCoopSession,
  hostTickCoop,
  onPlayerJoined,
  onPlayerLeft,
  onRelayHello,
} from "./coop/coopSession";
import { mountCampaignGrid, refreshCampaignGrid } from "./panel/campaignGrid";
import { economyStatusHtml } from "./panel/economyIcons";
import { mountGearPanel, refreshGearPanelRoot } from "./panel/gearPanel";
import { wirePanelUiSounds } from "./panel/uiSounds";
import type { GameStateDelta } from "@zbd/sim";

let runtime: GameRuntime;
let phaserGame: Phaser.Game;
let relay: RelayClient | null = null;
const coopSession = createCoopSession();

async function boot() {
  await loadAppConfig();
  runtime = await loadRuntime();

  phaserGame = createPhaserGame(document.getElementById("game-root")!, runtime);
  phaserGame.scene.start("strip", { runtime });

  wirePanel();
  await wireRelay();

  setInterval(async () => {
    if (runtime.isCoopHost || !runtime.inCoopRoom) {
      const beforeControllers = new Set(
        runtime.state.survivors.map((s) => s.controllerId).filter(Boolean),
      );
      runtime = hostTickCoop(coopSession, runtime);
      runtime = { ...runtime, state: simTick(runtime.state) };
      if (runtime.isCoopHost && relay) {
        for (const s of runtime.state.survivors) {
          if (s.controllerId && !beforeControllers.has(s.controllerId)) {
            relay.sendAssignSurvivor(s.controllerId, s.id);
          }
        }
      }
      getStripScene(phaserGame)?.setRuntime(runtime);
      if (runtime.isCoopHost && relay) {
        const delta = buildHostDelta(coopSession, runtime);
        if (delta) relay?.sendHostDelta(delta);
      }
    }
    refreshPanel();
  }, 100);

  setInterval(() => void persistRuntime(runtime), 15000);

  void initStripWindow();
}

async function initStripWindow() {
  const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
  if (!tauri) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("dock_strip_window");
  } catch {
    /* non-tauri */
  }
}

function panelActions() {
  return {
    applyCommand: (partial: CommandInput) => applyPlayerCommand(partial),
    selectSurvivor: (survivorId: string) => {
      runtime = { ...runtime, assignedSurvivorId: survivorId };
      refreshPanel();
    },
  };
}

function wirePanel() {
  const panel = document.getElementById("panel")!;
  const closeBtn = document.getElementById("panel-close")!;

  phaserGame.events.on("toggle-panel", () => {
    const expanded = document.body.classList.toggle("expanded");
    panel.classList.toggle("hidden", !expanded);
    panel.setAttribute("aria-hidden", expanded ? "false" : "true");
    refreshPanel();
  });

  closeBtn.addEventListener("click", () => {
    document.body.classList.remove("expanded");
    panel.classList.add("hidden");
  });

  const upgrades = document.getElementById("upgrade-buttons")!;
  for (const id of BASE_UPGRADE_IDS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.upgrade = id;
    btn.addEventListener("click", () => {
      applyPlayerCommand({ type: "UPGRADE_BASE", upgradeId: id });
    });
    upgrades.appendChild(btn);
  }

  mountGearPanel(document.getElementById("gear-panel-root")!, () => runtime, panelActions());
  mountCampaignGrid(
    document.getElementById("campaign-grid-root")!,
    () => runtime,
    panelActions(),
  );
  wirePanelUiSounds(panel);

  document.getElementById("strip-click-through")?.addEventListener("change", async (ev) => {
    const checked = (ev.target as HTMLInputElement).checked;
    const tauri = (window as unknown as { __TAURI__?: unknown }).__TAURI__;
    if (tauri) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_strip_click_through", { enabled: checked });
    }
  });

  refreshPanel();
}

function applyPlayerCommand(partial: CommandInput) {
  if (runtime.inCoopRoom && !runtime.isCoopHost) {
    relay?.sendGuestCommand(partial);
    return;
  }
  runtime = applyLocalCommand(coopSession, runtime, partial);
  getStripScene(phaserGame)?.setRuntime(runtime);
  refreshPanel();
  if (runtime.isCoopHost && relay) {
    relay.sendHostSnapshot({ state: runtime.state });
    const delta = buildHostDelta(coopSession, runtime);
    if (delta) relay?.sendHostDelta(delta);
  }
}

function refreshPanel() {
  const status = document.getElementById("status-lines")!;
  const s = runtime.state;
  status.innerHTML = [
    `Encounter wave ${s.wave} · Tick ${s.tick}`,
    economyStatusHtml(s),
    `Kills ${s.totalKills} · Inventory ${s.inventory.length}`,
    `Survivors: ${s.survivors.map((x) => x.name).join(", ")}`,
  ]
    .map((line) => `<div>${line}</div>`)
    .join("");

  document.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach((btn) => {
    const id = btn.dataset.upgrade as BaseUpgradeId;
    btn.textContent = upgradeLabel(id, s);
  });

  refreshGearPanelRoot(document.getElementById("gear-panel-root"));
  refreshCampaignGrid(document.getElementById("campaign-grid-root"));
}

async function wireRelay() {
  const statusEl = document.getElementById("coop-status")!;
  relay = new RelayClient({
    onHello: (id) => {
      runtime = onRelayHello(coopSession, id, runtime);
      statusEl.textContent = `Connected · ${id.slice(0, 8)}…`;
    },
    onRoomCreated: (code, exp) => {
      runtime = { ...runtime, inCoopRoom: true, isCoopHost: true, assignedSurvivorId: runtime.state.survivors[0]?.id ?? null };
      coopSession.lastBroadcastState = runtime.state;
      statusEl.textContent = `Hosting · code ${code} (expires ${new Date(exp).toLocaleTimeString()})`;
      relay?.sendHostSnapshot({ state: runtime.state });
    },
    onRedeemResult: (ok, reason, code) => {
      if (!ok) {
        statusEl.textContent = `Join failed: ${reason ?? "error"}`;
        return;
      }
      runtime = { ...runtime, inCoopRoom: true, isCoopHost: false };
      statusEl.textContent = `Joined room ${code} · waiting for spawn…`;
    },
    onPlayerJoined: (clientId) => {
      if (!runtime.isCoopHost) return;
      runtime = onPlayerJoined(coopSession, runtime, clientId);
      statusEl.textContent = `Guest joined · spawn scheduled`;
    },
    onPlayerLeft: (clientId) => {
      if (!runtime.isCoopHost) return;
      runtime = onPlayerLeft(coopSession, runtime, clientId);
      getStripScene(phaserGame)?.setRuntime(runtime);
      relay?.sendHostSnapshot({ state: runtime.state });
    },
    onGuestCommand: (from, payload) => {
      if (!runtime.isCoopHost) return;
      runtime = applyHostGuestCommand(coopSession, runtime, from, payload as CommandInput);
      getStripScene(phaserGame)?.setRuntime(runtime);
      refreshPanel();
      relay?.sendHostSnapshot({ state: runtime.state });
      const delta = buildHostDelta(coopSession, runtime);
      if (delta) relay?.sendHostDelta(delta);
    },
    onHostSnapshot: (payload) => {
      if (runtime.isCoopHost) return;
      const p = payload as { state: typeof runtime.state };
      if (p.state) {
        runtime = { ...runtime, state: p.state };
        runtime = assignGuestSurvivor(runtime);
        getStripScene(phaserGame)?.setRuntime(runtime);
        refreshPanel();
      }
    },
    onHostDelta: (payload) => {
      if (runtime.isCoopHost) return;
      runtime = applyGuestDelta(runtime, payload as GameStateDelta);
      runtime = assignGuestSurvivor(runtime);
      getStripScene(phaserGame)?.setRuntime(runtime);
      refreshPanel();
    },
    onAssignSurvivor: (clientId, survivorId) => {
      if (runtime.relayClientId !== clientId) return;
      runtime = { ...runtime, assignedSurvivorId: survivorId };
      if (survivorId) {
        statusEl.textContent = `Controlling ${survivorId}`;
      }
      refreshPanel();
    },
  });

  relay.connect();

  document.getElementById("coop-host")!.addEventListener("click", () => relay?.createRoom());
  document.getElementById("coop-join")!.addEventListener("click", () => {
    const code = (document.getElementById("coop-code") as HTMLInputElement).value;
    relay?.redeem(code);
  });
}

void boot();
