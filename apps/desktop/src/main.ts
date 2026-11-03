import { createPhaserGame, getStripScene } from "./game/stripScene";
import {
  BASE_UPGRADE_IDS,
  loadRuntime,
  persistRuntime,
  issueCommand,
  upgradeLabel,
  type GameRuntime,
  type BaseUpgradeId,
  type CommandInput,
} from "./game/runtime";
import { RelayClient } from "./net/relayClient";
import { simTick } from "@zbd/sim";

let runtime: GameRuntime;
let phaserGame: Phaser.Game;
let relay: RelayClient | null = null;

async function boot() {
  runtime = await loadRuntime();

  phaserGame = createPhaserGame(document.getElementById("game-root")!, runtime);
  phaserGame.scene.start("strip", { runtime });

  wirePanel();
  wireRelay();

  setInterval(async () => {
    if (runtime.isCoopHost || !runtime.inCoopRoom) {
      runtime = { ...runtime, state: simTick(runtime.state) };
      getStripScene(phaserGame)?.setRuntime(runtime);
      if (runtime.isCoopHost && relay) {
        relay.sendHostDelta({ tick: runtime.state.tick, wave: runtime.state.wave });
      }
    }
    refreshPanel();
  }, 100);

  setInterval(() => void persistRuntime(runtime), 15000);
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

  refreshPanel();
}

function applyPlayerCommand(partial: CommandInput) {
  if (runtime.inCoopRoom && !runtime.isCoopHost) {
    relay?.sendGuestCommand(partial);
    return;
  }
  runtime = issueCommand(runtime, partial);
  getStripScene(phaserGame)?.setRuntime(runtime);
  refreshPanel();
  if (runtime.isCoopHost && relay) {
    relay.sendHostSnapshot({ state: runtime.state });
  }
}

function refreshPanel() {
  const status = document.getElementById("status-lines")!;
  const s = runtime.state;
  status.innerHTML = [
    `Wave ${s.wave} · Tick ${s.tick}`,
    `Currency ${s.currency} · Scrap ${s.scrap}`,
    `Kills ${s.totalKills} · Inventory ${s.inventory.length}`,
    `Survivors: ${s.survivors.map((x) => x.name).join(", ")}`,
  ]
    .map((line) => `<div>${line}</div>`)
    .join("");

  document.querySelectorAll<HTMLButtonElement>("[data-upgrade]").forEach((btn) => {
    const id = btn.dataset.upgrade as BaseUpgradeId;
    btn.textContent = upgradeLabel(id, s);
  });
}

function wireRelay() {
  const statusEl = document.getElementById("coop-status")!;
  relay = new RelayClient({
    onHello: (id) => {
      statusEl.textContent = `Connected · ${id.slice(0, 8)}…`;
    },
    onRoomCreated: (code, exp) => {
      runtime = { ...runtime, inCoopRoom: true, isCoopHost: true };
      statusEl.textContent = `Hosting · code ${code} (expires ${new Date(exp).toLocaleTimeString()})`;
      relay?.sendHostSnapshot({ state: runtime.state });
    },
    onRedeemResult: (ok, reason, code) => {
      if (!ok) {
        statusEl.textContent = `Join failed: ${reason ?? "error"}`;
        return;
      }
      runtime = { ...runtime, inCoopRoom: true, isCoopHost: false };
      statusEl.textContent = `Joined room ${code}`;
    },
    onGuestCommand: (_from: string, payload: unknown) => {
      if (!runtime.isCoopHost) return;
      runtime = issueCommand(runtime, payload as CommandInput);
      getStripScene(phaserGame)?.setRuntime(runtime);
      refreshPanel();
      relay?.sendHostSnapshot({ state: runtime.state });
    },
    onHostSnapshot: (payload) => {
      if (runtime.isCoopHost) return;
      const p = payload as { state: typeof runtime.state };
      if (p.state) {
        runtime = { ...runtime, state: p.state };
        getStripScene(phaserGame)?.setRuntime(runtime);
        refreshPanel();
      }
    },
    onHostDelta: () => {},
  });

  relay.connect();

  document.getElementById("coop-host")!.addEventListener("click", () => relay?.createRoom());
  document.getElementById("coop-join")!.addEventListener("click", () => {
    const code = (document.getElementById("coop-code") as HTMLInputElement).value;
    relay?.redeem(code);
  });
}

void boot();
