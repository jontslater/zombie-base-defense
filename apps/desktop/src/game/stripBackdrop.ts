import Phaser from "phaser";
import { STRIP_GROUND_Y } from "@zbd/sim";

const STRIP_W = 400;
const STRIP_H = 80;

export class StripBackdrop {
  private platform!: Phaser.GameObjects.Graphics;
  private deco!: Phaser.GameObjects.Graphics;
  private skyline!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;
  private bushLayer!: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {}

  create() {
    const sky = this.scene.add.graphics().setDepth(-15);
    sky.fillGradientStyle(0x483858, 0x483858, 0xc89068, 0xa87850, 1);
    sky.fillRect(0, 0, STRIP_W, STRIP_H);

    this.skyline = this.scene.add.graphics().setDepth(-12);
    this.drawSkyline();

    this.platform = this.scene.add.graphics().setDepth(-1);
    this.deco = this.scene.add.graphics().setDepth(0);
    this.bushLayer = this.scene.add.graphics().setDepth(1);
    this.drawPlatform();

    this.scene.add
      .rectangle(STRIP_W / 2, 24, STRIP_W, 48, 0xffd8a8, 0.06)
      .setDepth(0.3);

    this.vignette = this.scene.add.graphics().setDepth(26);
    this.drawVignette();
  }

  private drawSkyline() {
    this.skyline.clear();
    this.skyline.fillStyle(0x3a4868, 0.55);
    const bases = [20, 55, 110, 180, 250, 310, 360];
    for (const b of bases) {
      const h = 12 + (b % 17);
      this.skyline.fillRect(b, STRIP_GROUND_Y - 22 - h, 10 + (b % 8), h);
      this.skyline.fillRect(b + 4, STRIP_GROUND_Y - 28 - h, 6, 6);
    }
    this.skyline.fillStyle(0x2a3858, 0.4);
    this.skyline.fillTriangle(0, STRIP_GROUND_Y - 14, 80, STRIP_GROUND_Y - 30, 160, STRIP_GROUND_Y - 14);
    this.skyline.fillTriangle(200, STRIP_GROUND_Y - 12, 300, STRIP_GROUND_Y - 26, 400, STRIP_GROUND_Y - 12);
  }

  private drawPlatform() {
    const grassTop = STRIP_GROUND_Y - 8;
    const grassH = 5;
    const dirtH = 9;

    this.platform.clear();
    this.platform.fillStyle(0x5a4428, 1);
    this.platform.fillRoundedRect(2, grassTop + grassH - 1, STRIP_W - 4, dirtH + 5, 3);
    this.platform.fillStyle(0x3d2e1c, 1);
    this.platform.fillRect(6, grassTop + grassH + 2, STRIP_W - 12, dirtH - 2);
    this.platform.fillStyle(0x6a5038, 0.7);
    this.platform.fillRect(8, grassTop + grassH + 3, STRIP_W - 16, 2);

    this.platform.fillStyle(0x4cb848, 1);
    this.platform.fillRoundedRect(4, grassTop - 1, STRIP_W - 8, grassH + 2, 4);
    this.platform.fillStyle(0x70e068, 0.95);
    this.platform.fillRect(4, grassTop, STRIP_W - 8, 2);
    this.platform.lineStyle(1, 0x2a6828, 1);
    this.platform.strokeRoundedRect(4, grassTop - 1, STRIP_W - 8, grassH + 2, 4);

    this.deco.clear();
    for (let x = 12; x < STRIP_W - 10; x += 14 + (x % 5)) {
      const tuftH = 2 + (x % 3);
      this.deco.fillStyle(0x88f078, 0.9);
      this.deco.fillTriangle(x, grassTop, x + 3, grassTop - tuftH, x + 6, grassTop);
      this.deco.fillStyle(0x58c050, 0.85);
      this.deco.fillRect(x + 1, grassTop, 4, 1);
    }
    this.deco.fillStyle(0x9a9088, 0.9);
    this.deco.fillEllipse(36, grassTop + 2, 4, 3);
    this.deco.fillEllipse(248, grassTop + 2, 5, 3);
    this.deco.fillStyle(0xffb0d8, 0.95);
    this.deco.fillCircle(88, grassTop - 2, 2);
    this.deco.fillCircle(156, grassTop - 1, 2);
    this.deco.fillStyle(0xffffff, 0.9);
    this.deco.fillCircle(210, grassTop - 2, 1.5);

    this.bushLayer.clear();
    this.bushLayer.fillStyle(0x3a8840, 0.85);
    this.bushLayer.fillEllipse(52, grassTop - 3, 12, 6);
    this.bushLayer.fillStyle(0x48a048, 0.7);
    this.bushLayer.fillEllipse(320, grassTop - 2, 10, 5);
  }

  private drawVignette() {
    this.vignette.clear();
    this.vignette.fillStyle(0x201018, 0.25);
    this.vignette.fillRect(0, 0, 22, STRIP_H);
    this.vignette.fillRect(STRIP_W - 22, 0, 22, STRIP_H);
    this.vignette.fillStyle(0x201018, 0.1);
    this.vignette.fillRect(0, 0, STRIP_W, 6);
  }

  updateParallax(march01: number, _sway: number) {
    void _sway;
    this.skyline.x = -march01 * 12;
  }
}
