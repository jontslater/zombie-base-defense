import type { GearSlot } from "@zbd/sim";

const SLOT_ICON: Record<GearSlot, string> = {
  weapon: "/sprites/weapon_icon.png",
  armor: "/ui/icon_armor.png",
  tool: "/ui/icon_tool.png",
  trinket: "/ui/star.png",
};

export function gearSlotIconSrc(slot: GearSlot): string {
  return SLOT_ICON[slot];
}

export function appendSlotIcon(row: HTMLElement, slot: GearSlot): void {
  const label = row.querySelector(".slot-label");
  if (!label) return;
  const img = document.createElement("img");
  img.src = gearSlotIconSrc(slot);
  img.alt = "";
  img.className = "slot-icon";
  img.width = 14;
  img.height = 14;
  label.prepend(img);
}
