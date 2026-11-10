import Phaser from "phaser";
import { STRIP_GROUND_Y } from "@zbd/sim";

const STRIP_W = 400;
const STRIP_H = 80;

export class StripBackdrop {
  private hillA!: Phaser.GameObjects.Image;
  private hillB!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.Graphics;
  private grass!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {}

  create() {
    this.scene.add
      .rectangle(STRIP_W / 2, STRIP_H / 2, STRIP_W, STRIP_H, 0x141a22)
      .setDepth(-10);

    this.hillA = this.scene.add
      .image(120, STRIP_GROUND_Y - 18, "sprites", "wall")
      .setTint(0x2d4a3a)
      .setAlpha(0.35)
      .setScale(1.8, 0.35)
      .setDepth(-8);
    this.hillB = this.scene.add
      .image(300, STRIP_GROUND_Y - 14, "sprites", "wall")
      .setTint(0x3a2e4a)
      .setAlpha(0.28)
      .setScale(2.2, 0.28)
      .setDepth(-8);

    this.ground = this.scene.add.graphics().setDepth(-2);
    this.grass = this.scene.add.graphics().setDepth(-1);
    this.drawGroundPlane();

    this.scene.add
      .rectangle(STRIP_W / 2, STRIP_GROUND_Y - 16, STRIP_W, 34, 0x6eb6ff, 0.04)
      .setDepth(0.5);

    this.vignette = this.scene.add.graphics().setDepth(25);
    this.drawVignette();
  }

  private drawGroundPlane() {
    this.ground.clear();
    this.ground.fillStyle(0x1f1610, 1);
    this.ground.fillRect(0, STRIP_GROUND_Y - 5, STRIP_W, STRIP_H - STRIP_GROUND_Y + 6);
    this.ground.fillStyle(0x2a2218, 1);
    for (let x = 0; x < STRIP_W; x += 16) {
      this.ground.fillRect(x, STRIP_GROUND_Y, 15, 4);
    }
    this.ground.fillStyle(0x3d2c1c, 0.6);
    this.ground.fillRect(0, STRIP_GROUND_Y + 4, STRIP_W, 20);

    this.grass.clear();
    this.grass.fillStyle(0x3d6b45, 1);
    this.grass.fillRect(0, STRIP_GROUND_Y - 3, STRIP_W, 3);
    this.grass.fillStyle(0x52a05b, 0.85);
    for (let x = 0; x < STRIP_W; x += 8) {
      this.grass.fillTriangle(x, STRIP_GROUND_Y - 3, x + 4, STRIP_GROUND_Y - 6, x + 8, STRIP_GROUND_Y - 3);
    }
  }

  private drawVignette() {
    this.vignette.clear();
    this.vignette.fillStyle(0x000000, 0.28);
    this.vignette.fillRect(0, 0, 28, STRIP_H);
    this.vignette.fillRect(STRIP_W - 28, 0, 28, STRIP_H);
    this.vignette.fillStyle(0x000000, 0.18);
    this.vignette.fillRect(0, 0, STRIP_W, 10);
  }

  updateParallax(march01: number, sway: number) {
    this.hillA.x = 100 + march01 * 24;
    this.hillB.x = 280 - march01 * 18;
    this.hillA.y = STRIP_GROUND_Y - 18 + Math.sin(sway * 0.2) * 0.5;
    this.hillB.y = STRIP_GROUND_Y - 14 + Math.cos(sway * 0.15) * 0.5;
  }
}
