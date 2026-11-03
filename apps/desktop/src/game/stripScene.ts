import Phaser from "phaser";
import type { GameRuntime } from "./runtime";

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super("strip");
  }

  init(data: { runtime: GameRuntime }) {
    this.rt = data.runtime;
  }

  preload() {
    this.load.image("survivor", "/sprites/survivor.png");
    this.load.image("zombie", "/sprites/zombie.png");
    this.load.image("base", "/sprites/base.png");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0f14");

    this.add.image(20, 40, "survivor").setScale(1);
    this.add.image(60, 40, "zombie").setScale(1);
    this.add.image(370, 40, "base").setScale(1);

    this.add.rectangle(200, 62, 360, 8, 0x2a3544);
    this.barHp = this.add.rectangle(22, 62, 360, 8, 0x3d8bfd);

    this.label = this.add
      .text(200, 8, "", { fontSize: "11px", color: "#e8eef5" })
      .setOrigin(0.5, 0);

    this.input.on("pointerdown", () => {
      this.game.events.emit("toggle-panel");
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.refresh(),
    });

    this.refresh();
  }

  setRuntime(rt: GameRuntime) {
    this.rt = rt;
    this.refresh();
  }

  refresh() {
    const s = this.rt.state;
    const hpRatio = Math.max(0, s.baseCoreHp / s.baseCoreMaxHp);
    this.barHp.width = 360 * hpRatio;
    this.barHp.fillColor = hpRatio > 0.35 ? 0x3d8bfd : 0xe74c3c;

    const combat = s.combat;
    const combatText = combat
      ? ` | Z:${combat.zombiesRemaining}${combat.isBoss ? " BOSS" : ""}`
      : " | idle";
    this.label.setText(
      `W${s.wave} | ${s.currency}c | Core ${Math.floor(s.baseCoreHp)}/${s.baseCoreMaxHp}${combatText}`,
    );
  }
}

export function createPhaserGame(parent: HTMLElement, _runtime: GameRuntime): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 400,
    height: 80,
    parent,
    backgroundColor: "#0b0f14",
    scene: [StripScene],
    scale: {
      mode: Phaser.Scale.NONE,
    },
    fps: {
      target: 30,
    },
  });
}

export function getStripScene(game: Phaser.Game): StripScene | null {
  return game.scene.getScene("strip") as StripScene;
}
