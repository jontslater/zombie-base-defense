import type { GameRuntime, CommandInput } from "../game/runtime";
import {
  CAMPAIGN_DIFFICULTY_LABELS,
  CAMPAIGN_LAST_STAGE_KEY,
  CAMPAIGN_NUM_ACTS,
  CAMPAIGN_NUM_DIFFICULTY_TIERS,
  CAMPAIGN_STAGES_PER_ACT,
  formatCampaignSummary,
  stageKeyFromParts,
} from "@zbd/sim";

type PanelActions = {
  applyCommand: (cmd: CommandInput) => void;
};

let mounted = false;

export function mountCampaignGrid(
  root: HTMLElement,
  getRuntime: () => GameRuntime,
  actions: PanelActions,
): void {
  if (mounted) return;
  mounted = true;

  root.innerHTML = "";

  const tierRow = document.createElement("div");
  tierRow.className = "campaign-tier-row";
  for (let t = 0; t < CAMPAIGN_NUM_DIFFICULTY_TIERS; t++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "campaign-tier-btn";
    btn.dataset.tier = String(t);
    btn.textContent = CAMPAIGN_DIFFICULTY_LABELS[t] ?? `T${t + 1}`;
    tierRow.appendChild(btn);
  }
  root.appendChild(tierRow);

  const table = document.createElement("div");
  table.className = "campaign-table";
  root.appendChild(table);

  const foot = document.createElement("p");
  foot.className = "campaign-foot muted";
  root.appendChild(foot);

  let selectedTier = 0;

  function paintCells() {
    const rt = getRuntime();
    const high = rt.state.campaignHighestClearedKey;
    const current = rt.state.currentStageKey;

    tierRow.querySelectorAll<HTMLButtonElement>(".campaign-tier-btn").forEach((b) => {
      const t = Number(b.dataset.tier);
      b.classList.toggle("campaign-tier-active", t === selectedTier);
    });

    table.innerHTML = "";

    for (let act = 0; act < CAMPAIGN_NUM_ACTS; act++) {
      const row = document.createElement("div");
      row.className = "campaign-act-row";
      const label = document.createElement("span");
      label.className = "campaign-act-label";
      label.textContent = `Act ${act + 1}`;
      row.appendChild(label);

      for (let st = 1; st <= CAMPAIGN_STAGES_PER_ACT; st++) {
        const key = stageKeyFromParts(selectedTier, act, st);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "campaign-cell";
        const isBoss = st === CAMPAIGN_STAGES_PER_ACT;
        cell.textContent = isBoss ? "★" : String(st);

        const cleared = high >= key;
        const isCurrent = current === key;
        if (!cleared) cell.classList.add("campaign-cell-locked");
        if (isCurrent) cell.classList.add("campaign-cell-current");
        if (isBoss) cell.classList.add("campaign-cell-boss");

        cell.title = `${CAMPAIGN_DIFFICULTY_LABELS[selectedTier]} · Act ${act + 1} stage ${st}${
          cleared ? "" : " (locked)"
        }`;

        if (cleared) {
          cell.addEventListener("click", () => {
            actions.applyCommand({
              type: "SET_CAMPAIGN_STAGE",
              tier: selectedTier,
              act,
              stage: st,
            });
          });
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }

    foot.textContent =
      high < 0
        ? `Clear stage 1 (Normal · Act 1) to unlock farming. Linear stages 0–${CAMPAIGN_LAST_STAGE_KEY}.`
        : `${formatCampaignSummary(current, high)} · wave ${rt.state.wave}`;
  }

  tierRow.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLButtonElement>(".campaign-tier-btn");
    if (!t || t.dataset.tier === undefined) return;
    selectedTier = Number(t.dataset.tier);
    paintCells();
  });

  root.addEventListener("zbd-campaign-refresh", () => paintCells());
  paintCells();
}

export function refreshCampaignGrid(root: HTMLElement | null): void {
  if (!root) return;
  root.dispatchEvent(new Event("zbd-campaign-refresh"));
}
