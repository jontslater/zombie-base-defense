import { ACHIEVEMENTS, COMPANIONS, type CompanionId } from "@zbd/sim";
import type { GameRuntime, CommandInput } from "../game/runtime";

type ProgressActions = {
  applyCommand: (cmd: CommandInput) => void;
};

function passiveLine(c: (typeof COMPANIONS)[number]): string {
  const p = c.passive;
  const bits: string[] = [];
  if (p.coreMitigationAdd) bits.push(`+${Math.round(p.coreMitigationAdd * 100)}% core resist`);
  if (p.currencyMultAdd) bits.push(`+${Math.round(p.currencyMultAdd * 100)}% income`);
  if (p.dpsMultAdd) bits.push(`+${Math.round(p.dpsMultAdd * 100)}% DPS`);
  if (p.lootDropChanceAdd) bits.push(`+${Math.round(p.lootDropChanceAdd * 100)}% drop chance`);
  if (p.scrapPerKill) bits.push(`+${p.scrapPerKill} scrap/kill`);
  if (p.regenMultAdd) bits.push(`+${Math.round(p.regenMultAdd * 100)}% idle regen`);
  return bits.length ? bits.join(" · ") : "—";
}

export function mountProgressPanels(
  companionsRoot: HTMLElement,
  achievementsRoot: HTMLElement,
  getRuntime: () => GameRuntime,
  actions: ProgressActions,
  onAchievementDelta: (newlyUnlockedTitles: string[]) => void,
): void {
  const render = () => {
    renderCompanions(companionsRoot, getRuntime(), actions);
    renderAchievements(achievementsRoot, getRuntime(), onAchievementDelta);
  };
  (companionsRoot as HTMLElement & { refreshProgress?: () => void }).refreshProgress = render;
  (achievementsRoot as HTMLElement & { refreshProgress?: () => void }).refreshProgress = render;
  render();
}

export function refreshProgressPanelRoot(root: HTMLElement | null): void {
  const el = root as HTMLElement & { refreshProgress?: () => void };
  el?.refreshProgress?.();
}

function renderCompanions(root: HTMLElement, rt: GameRuntime, actions: ProgressActions): void {
  root.innerHTML = "";
  const s = rt.state;
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent =
    "TBH-style companions: unlock by hunting tagged infected. All unlocked passives stack; equip one for the strip.";
  root.appendChild(intro);

  for (const c of COMPANIONS) {
    const row = document.createElement("div");
    row.className = "inventory-row companion-row";

    const left = document.createElement("div");
    const img = document.createElement("img");
    img.className = "companion-thumb";
    img.src = `/generated/slices/${c.spriteKey}.png`;
    img.alt = "";
    left.appendChild(img);

    const text = document.createElement("div");
    const unlocked = Boolean(s.companionsUnlocked[c.id]);
    const lockLine = unlocked
      ? "Unlocked · passive active"
      : c.unlockKind
        ? `Locked · slay ${c.unlockKills}× ${c.unlockKind}`
        : c.id === "convoy_parrot"
          ? "Locked · accrue offline ticks (comms)"
          : "Locked · convoy memorial (Reborn once)";
    text.innerHTML = `<strong>${c.name}</strong><br/><span class="muted">${c.blurb}</span><br/><span class="muted">${lockLine}</span><br/><span class="muted">${passiveLine(c)}</span>`;
    left.appendChild(text);
    row.appendChild(left);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.equippedCompanionId === c.id ? "Equipped" : "Equip";
    btn.disabled = !unlocked;
    if (unlocked) {
      btn.addEventListener("click", () =>
        actions.applyCommand({
          type: "SET_EQUIPPED_COMPANION",
          companionId: s.equippedCompanionId === c.id ? null : (c.id as CompanionId),
        }),
      );
    }
    row.appendChild(btn);
    root.appendChild(row);
  }
}

function renderAchievements(
  root: HTMLElement,
  rt: GameRuntime,
  onAchievementDelta: (newlyUnlockedTitles: string[]) => void,
): void {
  const s = rt.state;
  const prevJson = root.dataset.achSig ?? "";
  const nextSig = JSON.stringify(s.achievementsUnlocked);
  if (prevJson !== nextSig) {
    let prev: Record<string, boolean> = {};
    try {
      prev = JSON.parse(prevJson || "{}") as Record<string, boolean>;
    } catch {
      prev = {};
    }
    const newlyTitles: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (s.achievementsUnlocked[a.id] && !prev[a.id]) newlyTitles.push(a.title);
    }
    root.dataset.achSig = nextSig;
    if (newlyTitles.length) onAchievementDelta(newlyTitles);
  }

  root.innerHTML = "";
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = "Milestones logged locally; unlock pings a strip toast.";
  root.appendChild(intro);

  for (const a of ACHIEVEMENTS) {
    const row = document.createElement("div");
    row.className = "inventory-row achievement-row";
    const ok = Boolean(s.achievementsUnlocked[a.id]);
    row.classList.toggle("achievement-done", ok);
    row.innerHTML = `<span class="achievement-mark">${ok ? "✓" : "○"}</span><div><strong>${a.title}</strong><br/><span class="muted">${a.description}</span></div>`;
    root.appendChild(row);
  }
}

export function createToastHost(): HTMLElement {
  const host = document.createElement("div");
  host.id = "toast-host";
  host.setAttribute("aria-live", "polite");
  document.body.appendChild(host);
  return host;
}

export function showAchievementToast(host: HTMLElement, titles: string[]): void {
  for (const title of titles) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = `Comms: ${title}`;
    host.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }
}
