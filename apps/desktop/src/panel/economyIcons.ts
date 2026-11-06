import { MATERIAL_IDS, type MaterialId } from "@zbd/sim";

const ICON = {
  currency: "/generated/slices/icon_currency.png",
  scrap: "/generated/slices/icon_scrap.png",
  materials: {
    alloy: "/generated/slices/material_alloy.png",
    battery: "/generated/slices/material_battery.png",
    compound: "/generated/slices/material_compound.png",
    fiber: "/generated/slices/material_fiber.png",
    wiring: "/generated/slices/material_wiring.png",
  } satisfies Record<MaterialId, string>,
} as const;

export function economyStatusHtml(state: {
  currency: number;
  scrap: number;
  materials: Record<MaterialId, number>;
}): string {
  const currencyLine = `<span class="eco-line">${img(ICON.currency)}<span>${state.currency}</span></span>`;
  const scrapLine = `<span class="eco-line">${img(ICON.scrap)}<span>${state.scrap}</span></span>`;
  const mats = MATERIAL_IDS.map(
    (id) =>
      `<span class="eco-line">${img(ICON.materials[id])}<span>${state.materials[id]}</span></span>`,
  ).join(" ");
  return `<div class="status-economy">${currencyLine} · ${scrapLine}</div><div class="status-materials muted">${mats}</div>`;
}

function img(src: string) {
  return `<img src="${src}" alt="" width="14" height="14" class="eco-icon"/>`;
}
