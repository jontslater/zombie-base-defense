import type { GearSlot } from "@zbd/sim";

const SLOT_ICON: Record<GearSlot, string> = {
  weapon: "/generated/slices/weapon_icon.png",
  armor: "/generated/slices/armor_icon.png",
  tool: "/generated/slices/tool_icon.png",
  trinket: "/generated/slices/trinket_icon.png",
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
