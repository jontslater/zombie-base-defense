import Phaser from "phaser";
import { perimeterUnlockedCount, stripCampaignTag } from "@zbd/sim";
import type { GameRuntime } from "./runtime";

const SURVIVOR_SCALE = 0.52;
const ZOMBIE_SCALE = 0.52;
const STRUCTURE_SCALE = 0.42;
const ZOMBIE_TINT = 0x6ecf5a;

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private survivorSprites: Phaser.GameObjects.Image[] = [];
  private zombieSprites: Phaser.GameObjects.Image[] = [];
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;

  constructor() {
    super("strip");
  }

  init(data: { runtime: GameRuntime }) {
    this.rt = data.runtime;
  }

  preload() {
    this.load.atlas("sprites", "/generated/sprites-atlas.png", "/generated/sprites-atlas.json");
    this.load.audio("hit", "/audio/hit.ogg");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0f14");

    this.layoutStructures();

    this.add.rectangle(200, 62, 360, 8, 0x2a3544);
    this.barHp = this.add.rectangle(22, 62, 360, 8, 0x3d8bfd);

    this.label = this.add
      .text(200, 8, "", { fontSize: "11px", color: "#e8eef5" })
      .setOrigin(0.5, 0);

    this.hitSound = this.sound.add("hit", { volume: 0.35 });

    this.input.on("pointerdown", () => {
      this.game.events.emit("toggle-panel");
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.refresh(),
    });

    this.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => this.spawnProjectileFx(),
    });

    this.refresh();
  }

  setRuntime(rt: GameRuntime) {
    this.rt = rt;
    this.refresh();
  }

  private layoutStructures() {
    this.add.image(378, 42, "sprites", "base").setScale(STRUCTURE_SCALE).setDepth(1);
  }

  private layoutWallsAndTurrets() {
    for (const w of this.wallSprites) w.destroy();
    for (const t of this.turretSprites) t.destroy();
    this.wallSprites = [];
    this.turretSprites = [];

    const wallLevel = this.rt.state.upgrades.wall;
    for (let i = 0; i < wallLevel; i++) {
      const x = 318 - i * 22;
      const spr = this.add.image(x, 44, "sprites", "wall").setScale(STRUCTURE_SCALE * 0.85).setDepth(0);
      this.wallSprites.push(spr);
    }

    const turretLevel = this.rt.state.upgrades.turret;
    for (let i = 0; i < turretLevel; i++) {
      const x = 348 - i * 16;
      const y = 28 + i * 4;
      const spr = this.add.image(x, y, "sprites", "turret").setScale(STRUCTURE_SCALE * 0.55).setDepth(2);
      this.turretSprites.push(spr);
    }
  }

  private layoutCombatants() {
    for (const s of this.survivorSprites) s.destroy();
    for (const z of this.zombieSprites) z.destroy();
    this.survivorSprites = [];
    this.zombieSprites = [];

    const survivors = this.rt.state.survivors;
    survivors.forEach((_, i) => {
      const x = 22 + i * 24;
      const key = i % 2 === 0 ? "survivor" : "survivor_alt";
      const spr = this.add.image(x, 42, "sprites", key).setScale(SURVIVOR_SCALE);
      spr.setFlipX(false);
      spr.setDepth(3);
      this.survivorSprites.push(spr);
    });

    const combat = this.rt.state.combat;
    const zCount = combat ? Math.min(4, combat.zombiesRemaining) : 0;
    for (let i = 0; i < zCount; i++) {
      const x = 268 - i * 22;
      const spr = this.add.image(x, 42, "sprites", "zombie").setScale(ZOMBIE_SCALE);
      spr.setFlipX(true);
      spr.setTint(ZOMBIE_TINT);
      spr.setDepth(3);
      this.zombieSprites.push(spr);
    }
  }

  private spawnProjectileFx() {
    const combat = this.rt.state.combat;
    if (!combat || this.survivorSprites.length === 0 || this.zombieSprites.length === 0) return;

    const from =
      this.survivorSprites[Phaser.Math.Between(0, this.survivorSprites.length - 1)]!;
    const to = this.zombieSprites[Phaser.Math.Between(0, this.zombieSprites.length - 1)]!;

    const bullet = this.add
      .image(from.x + 6, from.y - 10, "sprites", "projectile")
      .setScale(0.16)
      .setDepth(4);
    this.tweens.add({
      targets: bullet,
      x: to.x - 4,
      y: to.y - 8,
      duration: 160,
      ease: "Linear",
      onComplete: () => bullet.destroy(),
    });
  }

  private maybePlayHitSound() {
    const combat = this.rt.state.combat;
    if (!combat || !this.hitSound) return;
    const now = this.time.now;
    if (now - this.lastHitAt < 450) return;
    this.lastHitAt = now;
    if (!this.sound.locked) {
      this.hitSound.play();
    }
  }

  refresh() {
    this.layoutWallsAndTurrets();
    this.layoutCombatants();

    const s = this.rt.state;
    const hpRatio = Math.max(0, s.baseCoreHp / s.baseCoreMaxHp);
    this.barHp.width = 360 * hpRatio;
    this.barHp.fillColor = hpRatio > 0.35 ? 0x3d8bfd : 0xe74c3c;

    const combat = s.combat;
    if (combat) this.maybePlayHitSound();

    const combatText = combat
      ? ` | Z:${combat.zombiesRemaining}${combat.isBoss ? " BOSS" : ""}`
      : " | idle";
    const camp = stripCampaignTag(s.currentStageKey);
    const perimeterN = perimeterUnlockedCount(s);
    this.label.setText(
      `${camp} | w${s.wave} | ${s.currency}c | Core ${Math.floor(s.baseCoreHp)}/${
        s.baseCoreMaxHp
      } | P${perimeterN}${combatText}`,
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
    audio: {
      disableWebAudio: false,
    },
  });
}

export function getStripScene(game: Phaser.Game): StripScene | null {
  return game.scene.getScene("strip") as StripScene;
}
