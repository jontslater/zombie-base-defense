import Phaser from "phaser";
import { STRIP_GROUND_Y } from "@zbd/sim";

/** TBH-style dark framed portal for base core (render-only). */
export class StripCorePanel {
  private frame!: Phaser.GameObjects.Graphics;
  private hpFill!: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene) {}

  create() {
    const px = 356;
    const py = STRIP_GROUND_Y - 28;
    this.frame = this.scene.add.graphics().setDepth(6);
    this.frame.fillStyle(0x1a1418, 0.92);
    this.frame.fillRoundedRect(px - 28, py - 4, 56, 34, 4);
    this.frame.lineStyle(2, 0x4a3848, 1);
    this.frame.strokeRoundedRect(px - 28, py - 4, 56, 34, 4);
    this.frame.lineStyle(1, 0x7a6088, 0.45);
    this.frame.strokeRoundedRect(px - 26, py - 2, 52, 30, 3);

    this.scene.add
      .image(px, STRIP_GROUND_Y - 10, "sprites", "base")
      .setOrigin(0.5, 1)
      .setScale(0.36)
      .setDepth(7);

    this.scene.add
      .rectangle(px - 22, py + 22, 44, 4, 0x2a1820)
      .setOrigin(0, 0.5)
      .setDepth(8);
    this.hpFill = this.scene.add
      .rectangle(px - 22, py + 22, 44, 3, 0x9a5ce8)
      .setOrigin(0, 0.5)
      .setDepth(9);
  }

  update(coreHp: number, coreMax: number) {
    const ratio = Math.max(0, coreHp / Math.max(1, coreMax));
    this.hpFill.width = 44 * ratio;
    this.hpFill.fillColor = ratio > 0.35 ? 0x6a9ae8 : 0xe85d6a;
  }
}
