import Phaser from "phaser";
import { STRIP_GROUND_Y } from "@zbd/sim";

const STRIP_W = 400;
const STRIP_H = 80;

export class StripBackdrop {
  private deco!: Phaser.GameObjects.Graphics;
  private platform!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;
  private clouds!: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {}

  create() {
    this.scene.add.rectangle(STRIP_W / 2, STRIP_H * 0.42, STRIP_W, STRIP_H, 0x5a8bb8, 1).setDepth(-12);
    this.scene.add
      .rectangle(STRIP_W / 2, STRIP_H * 0.72, STRIP_W, STRIP_H * 0.55, 0xc4e6a8, 0.35)
      .setDepth(-11);

    this.clouds = this.scene.add.graphics().setDepth(-9);
    this.drawClouds();

    this.platform = this.scene.add.graphics().setDepth(-1);
    this.deco = this.scene.add.graphics().setDepth(0);
    this.drawPlatform();

    this.scene.add
      .rectangle(STRIP_W / 2, STRIP_GROUND_Y - 22, STRIP_W, 40, 0xfff0c8, 0.07)
      .setDepth(0.4);

    this.vignette = this.scene.add.graphics().setDepth(26);
    this.drawVignette();
  }

  private drawClouds() {
    this.clouds.clear();
    this.clouds.fillStyle(0xf8ecd0, 0.22);
    this.clouds.fillEllipse(90, 16, 56, 12);
    this.clouds.fillEllipse(300, 20, 72, 14);
    this.clouds.fillStyle(0x8ec5e8, 0.15);
    this.clouds.fillEllipse(220, 10, 46, 10);
  }

  private drawPlatform() {
    const top = STRIP_GROUND_Y - 6;
    const grassH = 6;
    const dirtH = 14;

    this.platform.clear();
    this.platform.fillStyle(0x6a4d2e, 1);
    this.platform.fillRoundedRect(4, top + grassH - 1, STRIP_W - 8, dirtH + 8, 4);
    this.platform.fillStyle(0x4d3822, 1);
    this.platform.fillRect(8, top + grassH + 6, STRIP_W - 16, dirtH);

    this.platform.fillStyle(0x58c454, 1);
    this.platform.fillRoundedRect(6, top - 1, STRIP_W - 12, grassH + 2, 5);
    this.platform.fillStyle(0x78e06e, 0.9);
    this.platform.fillRect(6, top, STRIP_W - 12, 3);
    this.platform.lineStyle(1, 0x98f090, 0.5);
    this.platform.strokeRoundedRect(6, top - 1, STRIP_W - 12, grassH + 2, 5);

    this.deco.clear();
    this.deco.fillStyle(0xa0a898, 0.85);
    this.deco.fillEllipse(48, top + 2, 5, 3);
    this.deco.fillEllipse(210, top + 1, 6, 4);
    this.deco.fillStyle(0xffc4e8, 0.9);
    this.deco.fillCircle(130, top - 2, 2);
    this.deco.fillCircle(310, top - 1, 2);
    this.deco.fillStyle(0xffffff, 0.85);
    this.deco.fillCircle(292, top, 2);
    this.deco.fillStyle(0xffeeb0, 0.95);
    this.deco.fillCircle(172, top - 3, 2);
  }

  private drawVignette() {
    this.vignette.clear();
    this.vignette.fillStyle(0x302010, 0.22);
    this.vignette.fillRect(0, 0, 24, STRIP_H);
    this.vignette.fillRect(STRIP_W - 24, 0, 24, STRIP_H);
    this.vignette.fillStyle(0x302010, 0.12);
    this.vignette.fillRect(0, 0, STRIP_W, 8);
  }

  updateParallax(march01: number, _sway: number) {
    void _sway;
    this.clouds.x = -march01 * 18;
  }
}
