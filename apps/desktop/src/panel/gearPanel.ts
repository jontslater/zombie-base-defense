import {
  GEAR_SLOTS,
  RARITY_COLORS,
  SKILL_COSTS,
  SKILL_NODE_IDS,
  SKILL_PREREQS,
  STANCES,
  TARGET_MODES,
  WORKBENCH_ENHANCE_SCRAP,
  WORKBENCH_REROLL_CURRENCY,
  WORKBENCH_REROLL_SCRAP,
  type GearSlot,
  type SkillNodeId,
  type Stance,
  type TargetMode,
} from "@zbd/sim";
import type { GameRuntime, CommandInput } from "../game/runtime";
import { gearPowerForSurvivor, gearStatDelta } from "../game/gearStats";

export type PanelActions = {
  applyCommand: (cmd: CommandInput) => void;
  selectSurvivor: (survivorId: string) => void;
};

export function mountGearPanel(root: HTMLElement, getRuntime: () => GameRuntime, actions: PanelActions): void {
  root.innerHTML = `
    <div class="subtabs">
      <button type="button" data-subtab="gear" class="active">Gear</button>
      <button type="button" data-subtab="skills">Skills</button>
      <button type="button" data-subtab="workbench">Workbench</button>
    </div>
    <div id="subtab-gear" class="subtab-panel"></div>
    <div id="subtab-skills" class="subtab-panel hidden"></div>
    <div id="subtab-workbench" class="subtab-panel hidden"></div>
  `;

  const gearEl = root.querySelector("#subtab-gear") as HTMLElement;
  const skillsEl = root.querySelector("#subtab-skills") as HTMLElement;
  const benchEl = root.querySelector("#subtab-workbench") as HTMLElement;

  root.querySelectorAll<HTMLButtonElement>("[data-subtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-subtab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.subtab!;
      gearEl.classList.toggle("hidden", tab !== "gear");
      skillsEl.classList.toggle("hidden", tab !== "skills");
      benchEl.classList.toggle("hidden", tab !== "workbench");
    });
  });

  const render = () => {
    const rt = getRuntime();
    renderGearTab(gearEl, rt, actions);
    renderSkillsTab(skillsEl, rt, actions);
    renderWorkbenchTab(benchEl, rt, actions);
  };

  (root as HTMLElement & { refreshGearPanel?: () => void }).refreshGearPanel = render;
  render();
}

export function refreshGearPanelRoot(root: HTMLElement | null): void {
  const el = root as HTMLElement & { refreshGearPanel?: () => void };
  el?.refreshGearPanel?.();
}

function activeSurvivor(rt: GameRuntime) {
  if (rt.assignedSurvivorId) {
    return rt.state.survivors.find((s) => s.id === rt.assignedSurvivorId) ?? rt.state.survivors[0];
  }
  return rt.state.survivors[0];
}

function renderSurvivorPicker(
  container: HTMLElement,
  rt: GameRuntime,
  onSelect: (id: string) => void,
): void {
  const row = document.createElement("div");
  row.className = "btn-row";
  for (const s of rt.state.survivors) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.name;
    btn.classList.toggle("selected", activeSurvivor(rt)?.id === s.id);
    btn.addEventListener("click", () => onSelect(s.id));
    row.appendChild(btn);
  }
  container.appendChild(row);
}

function renderGearTab(el: HTMLElement, rt: GameRuntime, actions: PanelActions): void {
  el.innerHTML = "";
  const survivor = activeSurvivor(rt);
  if (!survivor) {
    el.textContent = "No survivors.";
    return;
  }

  const pickerHost = document.createElement("div");
  renderSurvivorPicker(pickerHost, rt, (id) => actions.selectSurvivor(id));
  el.appendChild(pickerHost);

  const slots = document.createElement("div");
  slots.className = "gear-slots";
  for (const slot of GEAR_SLOTS) {
    const item = survivor.gear[slot];
    const row = document.createElement("div");
    row.className = "gear-slot-row";
    row.innerHTML = `<span class="slot-label">${slot}</span>`;
    if (item) {
      const span = document.createElement("span");
      span.className = "gear-item";
      span.style.color = RARITY_COLORS[item.rarity];
      span.textContent = `${item.rarity} +${item.power}`;
      row.appendChild(span);
      const unequip = document.createElement("button");
      unequip.type = "button";
      unequip.textContent = "Unequip";
      unequip.addEventListener("click", () =>
        actions.applyCommand({ type: "UNEQUIP_GEAR", survivorId: survivor.id, slot }),
      );
      row.appendChild(unequip);
    } else {
      row.appendChild(document.createTextNode("— empty —"));
    }
    slots.appendChild(row);
  }
  el.appendChild(slots);

  const stanceRow = document.createElement("div");
  stanceRow.className = "btn-row";
  stanceRow.innerHTML = `<span class="slot-label">Stance</span>`;
  for (const stance of STANCES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = stance;
    btn.classList.toggle("selected", survivor.stance === stance);
    btn.addEventListener("click", () =>
      actions.applyCommand({ type: "SET_STANCE", survivorId: survivor.id, stance: stance as Stance }),
    );
    stanceRow.appendChild(btn);
  }
  el.appendChild(stanceRow);

  const targetRow = document.createElement("div");
  targetRow.className = "btn-row";
  targetRow.innerHTML = `<span class="slot-label">Target</span>`;
  for (const target of TARGET_MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = target;
    btn.classList.toggle("selected", survivor.target === target);
    btn.addEventListener("click", () =>
      actions.applyCommand({ type: "SET_TARGET", survivorId: survivor.id, target: target as TargetMode }),
    );
    targetRow.appendChild(btn);
  }
  el.appendChild(targetRow);

  const invTitle = document.createElement("h3");
  invTitle.textContent = "Inventory";
  el.appendChild(invTitle);

  const list = document.createElement("div");
  list.className = "inventory-list";
  rt.state.inventory.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const delta = gearStatDelta(survivor, item);
    const label = document.createElement("span");
    label.className = "gear-item";
    label.style.color = RARITY_COLORS[item.rarity];
    label.textContent = `${item.slot} ${item.rarity} +${item.power} (${delta >= 0 ? "+" : ""}${delta} vs equipped)`;
    row.appendChild(label);
    const equip = document.createElement("button");
    equip.type = "button";
    equip.textContent = "Equip";
    equip.addEventListener("click", () =>
      actions.applyCommand({ type: "EQUIP_GEAR", survivorId: survivor.id, inventoryIndex: index }),
    );
    row.appendChild(equip);
    list.appendChild(row);
  });
  if (rt.state.inventory.length === 0) {
    list.textContent = "No loot yet — clear waves for drops.";
  }
  el.appendChild(list);

  const dps = document.createElement("p");
  dps.className = "muted";
  dps.textContent = `Effective weapon power: ${gearPowerForSurvivor(survivor).toFixed(1)}`;
  el.appendChild(dps);
}

function renderSkillsTab(el: HTMLElement, rt: GameRuntime, actions: PanelActions): void {
  el.innerHTML = "";
  const survivor = activeSurvivor(rt);
  if (!survivor) return;

  const pickerHost = document.createElement("div");
  renderSurvivorPicker(pickerHost, rt, (id) => actions.selectSurvivor(id));
  el.appendChild(pickerHost);

  const pts = document.createElement("p");
  pts.textContent = `Skill points: ${survivor.skillPoints}`;
  el.appendChild(pts);

  const tree = document.createElement("div");
  tree.className = "skill-tree";
  for (const nodeId of SKILL_NODE_IDS) {
    const owned = survivor.skills[nodeId];
    const prereq = SKILL_PREREQS[nodeId];
    const locked = prereq ? !survivor.skills[prereq] : false;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.disabled = owned || locked || survivor.skillPoints < SKILL_COSTS[nodeId];
    btn.textContent = `${nodeId} (${SKILL_COSTS[nodeId]} pt)${owned ? " ✓" : ""}`;
    btn.addEventListener("click", () =>
      actions.applyCommand({ type: "SPEND_SKILL", survivorId: survivor.id, nodeId: nodeId as SkillNodeId }),
    );
    tree.appendChild(btn);
  }
  el.appendChild(tree);
}

function renderWorkbenchTab(el: HTMLElement, rt: GameRuntime, actions: PanelActions): void {
  el.innerHTML = "";
  const lvl = rt.state.upgrades.workbench;
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent =
    lvl > 0
      ? `Workbench L${lvl} · Scrap ${rt.state.scrap}`
      : "Upgrade the base Workbench to unlock crafting.";
  el.appendChild(intro);
  if (lvl <= 0) return;

  const survivor = activeSurvivor(rt);
  if (!survivor) return;

  const enhance = document.createElement("button");
  enhance.type = "button";
  enhance.textContent = `Enhance equipped weapon (${WORKBENCH_ENHANCE_SCRAP} scrap)`;
  enhance.addEventListener("click", () =>
    actions.applyCommand({
      type: "WORKBENCH_ENHANCE",
      survivorId: survivor.id,
      slot: "weapon" as GearSlot,
    }),
  );
  el.appendChild(enhance);

  const inv = document.createElement("div");
  inv.className = "inventory-list";
  rt.state.inventory.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const label = document.createElement("span");
    label.style.color = RARITY_COLORS[item.rarity];
    label.textContent = `${item.rarity} ${item.slot} +${item.power}`;
    row.appendChild(label);
    const reroll = document.createElement("button");
    reroll.type = "button";
    reroll.textContent = `Reroll (${WORKBENCH_REROLL_SCRAP}s / ${WORKBENCH_REROLL_CURRENCY}c)`;
    reroll.addEventListener("click", () =>
      actions.applyCommand({ type: "WORKBENCH_REROLL", inventoryIndex: index }),
    );
    row.appendChild(reroll);
    const enhanceInv = document.createElement("button");
    enhanceInv.type = "button";
    enhanceInv.textContent = "Enhance";
    enhanceInv.addEventListener("click", () =>
      actions.applyCommand({
        type: "WORKBENCH_ENHANCE",
        survivorId: survivor.id,
        inventoryIndex: index,
      }),
    );
    row.appendChild(enhanceInv);
    inv.appendChild(row);
  });
  el.appendChild(inv);
}
