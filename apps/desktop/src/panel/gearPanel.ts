import {
  ALCHEMY_FORGE_CURRENCY,
  ALCHEMY_FORGE_MATERIALS,
  ALCHEMY_FORGE_SCRAP,
  GEM_COMBINE_INPUT_COUNT,
  SOCKET_FORGE_MATERIALS,
  SOCKET_FORGE_SCRAP,
  campaignWaveNumberFromStageKey,
  GEAR_SLOTS,
  MATERIAL_IDS,
  PERIMETER_GRID,
  RARITIES,
  RARITY_COLORS,
  ROLE_LABELS,
  ROLE_PASSIVES,
  STANCES,
  SURVIVOR_ROLE_IDS,
  SYNTHESIS_INPUT_COUNT,
  SYNTHESIS_SCRAP_COST,
  TARGET_MODES,
  WORKBENCH_ENHANCE_SCRAP,
  WORKBENCH_REROLL_CURRENCY,
  WORKBENCH_REROLL_SCRAP,
  perimeterSecondForgeUnlocked,
  maxSocketsForRarity,
  materialsCanAfford,
  tryBuyPerimeterNode,
  canSpendSkill,
  skillPointCostForNextRank,
  skillRank,
  skillsForRole,
  type GearItem,
  type GearSlot,
  type SkillNodeDef,
  type SkillNodeId,
  type SurvivorRoleId,
  type Stance,
  type TargetMode,
} from "@zbd/sim";
import type { GameRuntime, CommandInput } from "../game/runtime";
import { gearPowerForSurvivor, gearStatDelta } from "../game/gearStats";
import { appendSlotIcon } from "./gearIcons";
function formatGearBrief(item: GearItem): string {
  const aff =
    item.affixes.length > 0 ? ` · ${item.affixes.map((a) => `${a.id}+${a.value}`).join(", ")}` : "";
  const sk =
    item.sockets.length > 0
      ? ` · sockets: ${item.sockets.map((g) => (g ? `${g.kind} T${g.tier}` : "empty")).join(" | ")}`
      : "";
  return `${item.rarity} +${item.power}${aff}${sk}`;
}

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
      <button type="button" data-subtab="perimeter">Perimeter</button>
    </div>
    <div id="subtab-gear" class="subtab-panel"></div>
    <div id="subtab-skills" class="subtab-panel hidden"></div>
    <div id="subtab-workbench" class="subtab-panel hidden"></div>
    <div id="subtab-perimeter" class="subtab-panel hidden"></div>
  `;

  const gearEl = root.querySelector("#subtab-gear") as HTMLElement;
  const skillsEl = root.querySelector("#subtab-skills") as HTMLElement;
  const benchEl = root.querySelector("#subtab-workbench") as HTMLElement;
  const perimeterEl = root.querySelector("#subtab-perimeter") as HTMLElement;

  root.querySelectorAll<HTMLButtonElement>("[data-subtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-subtab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.subtab!;
      gearEl.classList.toggle("hidden", tab !== "gear");
      skillsEl.classList.toggle("hidden", tab !== "skills");
      benchEl.classList.toggle("hidden", tab !== "workbench");
      perimeterEl.classList.toggle("hidden", tab !== "perimeter");
    });
  });

  const synthesisPick = new Set<number>();
  const gemCombinePick = new Set<number>();
  let lastInventorySig = "";
  let lastGemSig = "";

  const render = () => {
    const rt = getRuntime();
    const invSig = rt.state.inventory.map((i) => i.id).join("|");
    if (invSig !== lastInventorySig) {
      synthesisPick.clear();
      lastInventorySig = invSig;
    }
    const gemSig = rt.state.gemInventory.map((g) => g.id).join("|");
    if (gemSig !== lastGemSig) {
      gemCombinePick.clear();
      lastGemSig = gemSig;
    }
    renderGearTab(gearEl, rt, actions);
    renderSkillsTab(skillsEl, rt, actions);
    renderWorkbenchTab(benchEl, rt, actions, synthesisPick, gemCombinePick);
    renderPerimeterTab(perimeterEl, rt, actions);
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
    appendSlotIcon(row, slot);
    if (item) {
      const span = document.createElement("span");
      span.className = "gear-item";
      span.style.color = RARITY_COLORS[item.rarity];
      span.textContent = formatGearBrief(item);
      row.appendChild(span);
      const sockRow = document.createElement("div");
      sockRow.className = "socket-row";
      item.sockets.forEach((g, si) => {
        const lab = document.createElement("span");
        lab.className = "muted";
        lab.textContent = g ? `${g.kind} T${g.tier}` : `[${si}] empty`;
        sockRow.appendChild(lab);
        if (g) {
          const pull = document.createElement("button");
          pull.type = "button";
          pull.textContent = "Pull gem";
          pull.addEventListener("click", () =>
            actions.applyCommand({
              type: "UNSOCKET_GEM",
              survivorId: survivor.id,
              equipSlot: slot,
              socketIndex: si,
            }),
          );
          sockRow.appendChild(pull);
        } else if (rt.state.gemInventory.length > 0) {
          for (let gi = 0; gi < rt.state.gemInventory.length; gi++) {
            const gem = rt.state.gemInventory[gi]!;
            const ins = document.createElement("button");
            ins.type = "button";
            ins.textContent = `+${gem.kind} T${gem.tier}`;
            ins.addEventListener("click", () =>
              actions.applyCommand({
                type: "SOCKET_GEM",
                survivorId: survivor.id,
                equipSlot: slot,
                gemInventoryIndex: gi,
                socketIndex: si,
              }),
            );
            sockRow.appendChild(ins);
          }
        }
      });
      row.appendChild(sockRow);
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
    const delta = gearStatDelta(survivor, item, rt.state.currentStageKey);
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
  dps.textContent = `Effective weapon power: ${gearPowerForSurvivor(survivor, rt.state.currentStageKey).toFixed(1)}`;
  el.appendChild(dps);
}

function renderSkillsTab(el: HTMLElement, rt: GameRuntime, actions: PanelActions): void {
  el.innerHTML = "";
  const survivor = activeSurvivor(rt);
  if (!survivor) return;

  const pickerHost = document.createElement("div");
  renderSurvivorPicker(pickerHost, rt, (id) => actions.selectSurvivor(id));
  el.appendChild(pickerHost);

  const roleLine = document.createElement("div");
  roleLine.className = "btn-row";
  roleLine.innerHTML = `<span class="slot-label">Role</span>`;
  for (const role of SURVIVOR_ROLE_IDS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = ROLE_LABELS[role];
    btn.classList.toggle("selected", survivor.role === role);
    btn.addEventListener("click", () =>
      actions.applyCommand({
        type: "SET_SURVIVOR_ROLE",
        survivorId: survivor.id,
        role: role as SurvivorRoleId,
      }),
    );
    roleLine.appendChild(btn);
  }
  el.appendChild(roleLine);

  const passive = document.createElement("p");
  passive.className = "muted";
  const kit = survivor.role as SurvivorRoleId;
  const rp = ROLE_PASSIVES[kit];
  passive.textContent = `${rp.name}: ${rp.desc}`;
  el.appendChild(passive);

  const pts = document.createElement("p");
  pts.textContent = `Skill points: ${survivor.skillPoints}`;
  el.appendChild(pts);

  const tree = document.createElement("div");
  tree.className = "skill-tree";
  const nodes = skillsForRole(survivor.role as SurvivorRoleId);
  const byTier = new Map<number, SkillNodeDef[]>();
  for (const def of nodes) {
    const list = byTier.get(def.tier) ?? [];
    list.push(def);
    byTier.set(def.tier, list);
  }
  const tiers = [...byTier.keys()].sort((a, b) => a - b);
  for (const tier of tiers) {
    const sub = document.createElement("div");
    sub.className = "skill-tier";
    sub.innerHTML = `<div class="muted">Tier ${tier}</div>`;
    const row = document.createElement("div");
    row.className = "btn-row skill-tier-row";
    for (const def of byTier.get(tier)!) {
      const current = skillRank(survivor, def.id);
      const cost = skillPointCostForNextRank(def, current);
      const { ok, reason } = canSpendSkill(survivor, def.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.disabled = !ok;
      const tag =
        current >= def.maxRank ? `max ${current}/${def.maxRank}` : `rank ${current}/${def.maxRank}, next ${cost} pt`;
      let hint = "";
      if (!ok && reason === "prereq") hint = " (needs prereq)";
      else if (!ok && reason === "wrong role") hint = " (wrong role)";
      else if (!ok && reason === "points") hint = ` (need ${cost} pt)`;
      btn.textContent = `${def.shortName} — ${tag}${hint}`;
      btn.addEventListener("click", () =>
        actions.applyCommand({
          type: "SPEND_SKILL",
          survivorId: survivor.id,
          nodeId: def.id as SkillNodeId,
        }),
      );
      row.appendChild(btn);
    }
    sub.appendChild(row);
    tree.appendChild(sub);
  }
  el.appendChild(tree);
}

function renderWorkbenchTab(
  el: HTMLElement,
  rt: GameRuntime,
  actions: PanelActions,
  synthesisPick: Set<number>,
  gemCombinePick: Set<number>,
): void {
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

  const mats = document.createElement("p");
  mats.className = "muted materials-line";
  mats.textContent = `Materials: ${MATERIAL_IDS.map((id) => `${id} ${rt.state.materials[id]}`).join(" · ")}`;
  el.appendChild(mats);

  const gemsHead = document.createElement("h3");
  gemsHead.textContent = "Gem bag";
  el.appendChild(gemsHead);
  const gemsLine = document.createElement("p");
  gemsLine.className = "muted";
  gemsLine.textContent =
    rt.state.gemInventory.length === 0
      ? "No loose gems — boss kills can drop tier‑1 rubies, sapphires, or topazes."
      : `${rt.state.gemInventory.length} in bag (pick below for combine)`;
  el.appendChild(gemsLine);

  const gemBag = document.createElement("div");
  gemBag.className = "inventory-list gem-bag";
  rt.state.gemInventory.forEach((gem, gi) => {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.title = "Select for 3→1 gem combine";
    chk.checked = gemCombinePick.has(gi);
    chk.addEventListener("change", () => {
      if (chk.checked) {
        if (gemCombinePick.size < GEM_COMBINE_INPUT_COUNT) gemCombinePick.add(gi);
        else chk.checked = false;
      } else {
        gemCombinePick.delete(gi);
      }
    });
    row.appendChild(chk);
    const lab = document.createElement("span");
    lab.textContent = `${gem.kind} tier ${gem.tier}`;
    row.appendChild(lab);
    gemBag.appendChild(row);
  });
  if (rt.state.gemInventory.length === 0) {
    gemBag.textContent = "";
  }
  el.appendChild(gemBag);

  for (const i of [...gemCombinePick]) {
    if (i < 0 || i >= rt.state.gemInventory.length) gemCombinePick.delete(i);
  }
  const pickedGems = [...gemCombinePick]
    .map((i) => rt.state.gemInventory[i])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const sameGemKind =
    pickedGems.length === GEM_COMBINE_INPUT_COUNT &&
    pickedGems.every((g) => g.kind === pickedGems[0]?.kind && g.tier === pickedGems[0]?.tier);
  const canCombineGems =
    sameGemKind && (pickedGems[0]?.tier ?? 0) < 9 && rt.state.upgrades.workbench > 0;
  const combineGems = document.createElement("button");
  combineGems.type = "button";
  combineGems.disabled = !canCombineGems;
  combineGems.textContent = `Combine gems (${gemCombinePick.size}/${GEM_COMBINE_INPUT_COUNT}) → next tier`;
  combineGems.addEventListener("click", () => {
    if (gemCombinePick.size !== GEM_COMBINE_INPUT_COUNT) return;
    actions.applyCommand({ type: "GEM_COMBINE", gemInventoryIndices: [...gemCombinePick] });
    gemCombinePick.clear();
  });
  el.appendChild(combineGems);

  const sockTitle = document.createElement("h3");
  sockTitle.textContent = "Socket forge (alchemy bench)";
  el.appendChild(sockTitle);
  const sockMat = MATERIAL_IDS.filter((id) => SOCKET_FORGE_MATERIALS[id] > 0)
    .map((id) => `${id}×${SOCKET_FORGE_MATERIALS[id]}`)
    .join(", ");
  const sockP = document.createElement("p");
  sockP.className = "muted";
  sockP.textContent = `Add one empty socket to gear (max by rarity): ${SOCKET_FORGE_SCRAP} scrap + ${sockMat}`;
  el.appendChild(sockP);

  const alchemyTitle = document.createElement("h3");
  alchemyTitle.textContent = "Alchemy forge";
  el.appendChild(alchemyTitle);

  const forgeCur = perimeterSecondForgeUnlocked(rt.state)
    ? Math.max(1, ALCHEMY_FORGE_CURRENCY - 5)
    : ALCHEMY_FORGE_CURRENCY;
  const matCost = MATERIAL_IDS.filter((id) => ALCHEMY_FORGE_MATERIALS[id] > 0)
    .map((id) => `${id}×${ALCHEMY_FORGE_MATERIALS[id]}`)
    .join(", ");
  const alchemyP = document.createElement("p");
  alchemyP.className = "muted";
  alchemyP.textContent = `Roll one item into a chosen slot: ${ALCHEMY_FORGE_SCRAP} scrap + ${forgeCur}c + ${matCost}`;
  el.appendChild(alchemyP);

  const forgeRow = document.createElement("div");
  forgeRow.className = "btn-row";
  for (const slot of GEAR_SLOTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `Forge ${slot}`;
    btn.addEventListener("click", () =>
      actions.applyCommand({ type: "ALCHEMY_FORGE", slot: slot as GearSlot }),
    );
    forgeRow.appendChild(btn);
  }
  el.appendChild(forgeRow);

  if (perimeterSecondForgeUnlocked(rt.state)) {
    const aux = document.createElement("p");
    aux.className = "muted";
    aux.textContent = "Aux bench line: forge currency cost is reduced.";
    el.appendChild(aux);
  }

  const synTitle = document.createElement("h3");
  synTitle.textContent = "Synthesis crucible";
  el.appendChild(synTitle);

  const synP = document.createElement("p");
  synP.className = "muted";
  synP.textContent = `Select ${SYNTHESIS_INPUT_COUNT} items of the same rarity, then combine (costs ${SYNTHESIS_SCRAP_COST} scrap) for one item of the next tier.`;
  el.appendChild(synP);

  for (const i of [...synthesisPick]) {
    if (i < 0 || i >= rt.state.inventory.length) synthesisPick.delete(i);
  }

  const selectedItems = [...synthesisPick]
    .map((i) => rt.state.inventory[i])
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const sameRarity =
    selectedItems.length === SYNTHESIS_INPUT_COUNT &&
    selectedItems.every((it) => it.rarity === selectedItems[0]?.rarity);
  const ri = sameRarity ? RARITIES.indexOf(selectedItems[0]!.rarity) : -1;
  const hasNextTier = ri >= 0 && ri < RARITIES.length - 1;
  const canCombine =
    sameRarity &&
    hasNextTier &&
    rt.state.scrap >= SYNTHESIS_SCRAP_COST;

  const combine = document.createElement("button");
  combine.type = "button";
  combine.disabled = !canCombine;
  combine.textContent = `Combine (${synthesisPick.size}/${SYNTHESIS_INPUT_COUNT}) — ${SYNTHESIS_SCRAP_COST} scrap`;
  combine.addEventListener("click", () => {
    if (synthesisPick.size !== SYNTHESIS_INPUT_COUNT) return;
    actions.applyCommand({
      type: "SYNTHESIS_COMBINE",
      inventoryIndices: [...synthesisPick],
    });
    synthesisPick.clear();
  });
  el.appendChild(combine);

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

  const invTitle = document.createElement("h3");
  invTitle.textContent = "Inventory";
  el.appendChild(invTitle);

  const inv = document.createElement("div");
  inv.className = "inventory-list";
  rt.state.inventory.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const pick = document.createElement("input");
    pick.type = "checkbox";
    pick.title = "Select for synthesis";
    pick.checked = synthesisPick.has(index);
    pick.addEventListener("change", () => {
      if (pick.checked) {
        if (synthesisPick.size < SYNTHESIS_INPUT_COUNT) synthesisPick.add(index);
        else pick.checked = false;
      } else {
        synthesisPick.delete(index);
      }
    });
    row.appendChild(pick);

    const label = document.createElement("span");
    label.style.color = RARITY_COLORS[item.rarity];
    label.textContent = `${item.rarity} ${item.slot} ${formatGearBrief(item)}`;
    row.appendChild(label);
    const maxSoc = maxSocketsForRarity(item.rarity);
    const canForgeSocket =
      item.sockets.length < maxSoc &&
      rt.state.scrap >= SOCKET_FORGE_SCRAP &&
      materialsCanAfford(rt.state, SOCKET_FORGE_MATERIALS);
    const socketForge = document.createElement("button");
    socketForge.type = "button";
    socketForge.textContent = "Add socket";
    socketForge.disabled = !canForgeSocket;
    socketForge.title = canForgeSocket ? "" : `Max ${maxSoc} sockets for ${item.rarity} or need scrap/mats`;
    socketForge.addEventListener("click", () =>
      actions.applyCommand({ type: "SOCKET_FORGE", inventoryIndex: index }),
    );
    row.appendChild(socketForge);
    const sockInv = document.createElement("div");
    sockInv.className = "socket-row";
    item.sockets.forEach((g, si) => {
      const bit = document.createElement("span");
      bit.className = "muted";
      bit.textContent = g ? `${g.kind} T${g.tier}` : `[${si}]`;
      sockInv.appendChild(bit);
      if (g) {
        const pull = document.createElement("button");
        pull.type = "button";
        pull.textContent = "Pull";
        pull.addEventListener("click", () =>
          actions.applyCommand({ type: "UNSOCKET_GEM", inventoryGearIndex: index, socketIndex: si }),
        );
        sockInv.appendChild(pull);
      } else {
        for (let gi = 0; gi < rt.state.gemInventory.length; gi++) {
          const gem = rt.state.gemInventory[gi]!;
          const ins = document.createElement("button");
          ins.type = "button";
          ins.textContent = `+${gem.kind} T${gem.tier}`;
          ins.addEventListener("click", () =>
            actions.applyCommand({
              type: "SOCKET_GEM",
              inventoryGearIndex: index,
              gemInventoryIndex: gi,
              socketIndex: si,
            }),
          );
          sockInv.appendChild(ins);
        }
      }
    });
    row.appendChild(sockInv);
    const salvage = document.createElement("button");
    salvage.type = "button";
    salvage.title = "Break into crafting materials";
    salvage.textContent = "Salvage";
    salvage.addEventListener("click", () => actions.applyCommand({ type: "SALVAGE_GEAR", inventoryIndex: index }));
    row.appendChild(salvage);
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

function formatPerimeterCosts(
  costs: (typeof PERIMETER_GRID)[number]["costs"],
): string {
  return costs
    .map((c) => {
      if (c.kind === "currency") return `${c.amount}c`;
      if (c.kind === "scrap") return `${c.amount} scrap`;
      const parts = MATERIAL_IDS.filter((id) => (c.materials[id] ?? 0) > 0).map(
        (id) => `${id}×${c.materials[id]}`,
      );
      return parts.join(", ");
    })
    .join(" + ");
}

function renderPerimeterTab(el: HTMLElement, rt: GameRuntime, actions: PanelActions): void {
  el.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = "Perimeter grid";
  el.appendChild(h);
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent =
    "Radio relays, fence lamps, trap scheduler — meta unlocks for the long haul. Co-op: host purchases only.";
  el.appendChild(intro);

  const guestLocked = rt.inCoopRoom && !rt.isCoopHost;
  const encounterWave = campaignWaveNumberFromStageKey(rt.state.currentStageKey);

  for (const node of PERIMETER_GRID) {
    const row = document.createElement("div");
    row.className = "inventory-row perimeter-node-row";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${node.name}</strong><br/><span class="muted">${node.flavor}</span>`;
    row.appendChild(title);

    const unlocked = Boolean(rt.state.perimeterUnlocked[node.id]);
    const prereqOk = !node.requires || rt.state.perimeterUnlocked[node.requires];
    const waveOk = node.minWave === undefined || encounterWave >= node.minWave;
    const killsOk = node.minTotalKills === undefined || rt.state.totalKills >= node.minTotalKills;

    const status = document.createElement("p");
    status.className = "muted";
    if (unlocked) {
      status.textContent = "Unlocked.";
    } else {
      const bits: string[] = [];
      bits.push(`Cost: ${formatPerimeterCosts(node.costs)}`);
      if (node.requires) bits.push(`Needs: ${node.requires}`);
      if (node.minWave !== undefined) {
        bits.push(`Encounter wave ≥ ${node.minWave}${waveOk ? " ✓" : ""}`);
      }
      if (node.minTotalKills !== undefined) {
        bits.push(`Kills ≥ ${node.minTotalKills}${killsOk ? " ✓" : ""}`);
      }
      if (!prereqOk) bits.push("Parent node required");
      status.textContent = bits.join(" · ");
    }
    row.appendChild(status);

    const preview = unlocked ? null : tryBuyPerimeterNode(rt.state, node.id);
    const canBuy = !guestLocked && !unlocked && preview?.ok === true;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = unlocked ? "Owned" : guestLocked ? "Host only" : "Buy";
    btn.disabled = unlocked || guestLocked || !canBuy;
    if (!unlocked && !guestLocked && preview && !preview.ok) {
      btn.title = preview.reason;
    }
    btn.addEventListener("click", () =>
      actions.applyCommand({ type: "BUY_PERIMETER_NODE", nodeId: node.id }),
    );
    row.appendChild(btn);

    el.appendChild(row);
  }
}
