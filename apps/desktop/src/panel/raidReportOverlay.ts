import type { OfflineRaidReport } from "@zbd/sim";
import { MATERIAL_IDS } from "@zbd/sim";

function formatDurationMs(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function lootSummary(report: OfflineRaidReport): string {
  const n = report.rewards.loot.length;
  if (n === 0) return "—";
  const bySlot = new Map<string, number>();
  for (const it of report.rewards.loot) {
    bySlot.set(it.slot, (bySlot.get(it.slot) ?? 0) + 1);
  }
  return [...bySlot.entries()]
    .map(([slot, c]) => `${c}× ${slot}`)
    .join(", ")
    .slice(0, 120);
}

function materialsLine(report: OfflineRaidReport): string {
  const parts: string[] = [];
  for (const id of MATERIAL_IDS) {
    const v = report.rewards.materials[id];
    if (v > 0) parts.push(`${id} +${v}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function showRaidReportOverlay(report: OfflineRaidReport): void {
  const root = document.getElementById("raid-report-root");
  if (!root) return;

  root.innerHTML = "";
  root.classList.remove("hidden");

  const card = document.createElement("div");
  card.className = "raid-report-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Raid report");

  const title = document.createElement("h2");
  title.textContent = "Raid report";
  card.appendChild(title);

  const sub = document.createElement("p");
  sub.className = "muted raid-report-sub";
  sub.textContent = `Away ${formatDurationMs(report.timeAwayMs)} · Accrued ${formatDurationMs(report.accrualMs)} (cap ${formatDurationMs(report.accrualCapMs)}) · Sector ${report.sectorLabel}`;
  card.appendChild(sub);

  const ul = document.createElement("ul");
  ul.className = "raid-report-lines";
  const lines = [
    `Currency +${report.rewards.currency}`,
    `Scrap +${report.rewards.scrap}`,
    `Gems +${report.rewards.gems}`,
    `Materials: ${materialsLine(report)}`,
    `Loot: ${lootSummary(report)}`,
  ];
  for (const text of lines) {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  }
  card.appendChild(ul);

  const row = document.createElement("div");
  row.className = "raid-report-actions";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "OK";
  dismiss.addEventListener("click", () => {
    root.classList.add("hidden");
    root.innerHTML = "";
  });
  row.appendChild(dismiss);
  card.appendChild(row);

  root.appendChild(card);
}
