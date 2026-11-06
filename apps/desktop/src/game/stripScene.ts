import Phaser from "phaser";
import {
  perimeterUnlockedCount,
  stripCampaignTag,
  type GameState,
  type Stance,
  type WaveCombat,
} from "@zbd/sim";
import type { GameRuntime } from "./runtime";

const SURVIVOR_SCALE = 0.52;
const ZOMBIE_SCALE = 0.52;
const STRUCTURE_SCALE = 0.42;
const ZOMBIE_TINT = 0x6ecf5a;
const COMPANION_SCALE = 0.22;

const SURVIVOR_ROLES = ["tank", "dps", "support", "striker"] as const;
const ZOMBIE_KINDS = ["walker", "runner", "tank", "spitter", "boomer", "lurker"] as const;
const COMPANION_KEYS = [
  "companion_dog",
  "companion_cat",
  "companion_drone",
  "companion_bot",
  "companion_raven",
  "companion_droid_ball",
  "companion_gecko",
  "companion_hedgehog",
] as const;

function survivorRole(stance: Stance, index: number): (typeof SURVIVOR_ROLES)[number] {
  if (stance === "aggressive") return "dps";
  if (stance === "defensive") return "tank";
  if (stance === "support") return "support";
  return SURVIVOR_ROLES[index % SURVIVOR_ROLES.length]!;
}

function survivorFrameKey(
  role: (typeof SURVIVOR_ROLES)[number],
  tick: number,
  index: number,
  inCombat: boolean,
): string {
  const phase = inCombat ? (tick + index * 3) % 14 : 0;
  const attacking = inCombat && phase < 5;
  return attacking ? `survivor_${role}_attack` : `survivor_${role}_idle`;
}

function zombieKindForSlot(combat: WaveCombat, slotIndex: number): string {
  if (combat.isBoss && slotIndex === 0) return "boss";
  return ZOMBIE_KINDS[slotIndex % ZOMBIE_KINDS.length]!;
}

function zombieFrameKey(kind: string, tick: number, slotIndex: number, hitAnim: boolean): string {
  if (hitAnim) return `zombie_${kind}_hit`;
  const walk = (tick + slotIndex * 2) % 10 < 5 ? "walk_a" : "walk_b";
  return `zombie_${kind}_${walk}`;
}

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private survivorSprites: Phaser.GameObjects.Image[] = [];
  private zombieSprites: Phaser.GameObjects.Image[] = [];
  private companionSprites: Phaser.GameObjects.Image[] = [];
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;
  private prevZombiesRemaining: number | null = null;
  private deathBurstUntil = 0;
  private deathBurstX = 268;

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
    this.add.image(378, 42, "sprites", "base_core").setScale(STRUCTURE_SCALE).setDepth(1);
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

  private layoutCompanions(survivorCount: number) {
    for (const c of this.companionSprites) c.destroy();
    this.companionSprites = [];

    const baseX = Math.max(6, 16 - survivorCount * 3);
    const y = 56;
    for (let i = 0; i < COMPANION_KEYS.length; i++) {
      const key = COMPANION_KEYS[i]!;
      const spr = this.add
        .image(baseX + i * 10, y, "sprites", key)
        .setScale(COMPANION_SCALE)
        .setDepth(2);
      this.companionSprites.push(spr);
    }
  }

  private layoutCombatants() {
    for (const s of this.survivorSprites) s.destroy();
    for (const z of this.zombieSprites) z.destroy();
    this.survivorSprites = [];
    this.zombieSprites = [];

    const state: GameState = this.rt.state;
    const combat = state.combat;
    const survivors = state.survivors;
    const tick = state.tick;

    survivors.forEach((survivor, i) => {
      const x = 22 + i * 24;
      const role = survivorRole(survivor.stance, i);
      const frame = survivorFrameKey(role, tick, i, Boolean(combat));
      const spr = this.add.image(x, 42, "sprites", frame).setScale(SURVIVOR_SCALE);
      spr.setFlipX(false);
      spr.setDepth(3);
      this.survivorSprites.push(spr);
    });

    this.layoutCompanions(survivors.length);

    const now = this.time.now;
    const hitAnim = combat && now - this.lastHitAt < 140;

    if (combat) {
      if (this.prevZombiesRemaining !== null && combat.zombiesRemaining < this.prevZombiesRemaining) {
        this.deathBurstUntil = now + 320;
        this.deathBurstX = 268;
      }
      this.prevZombiesRemaining = combat.zombiesRemaining;
    } else {
      this.prevZombiesRemaining = null;
    }

    const zCount = combat ? Math.min(4, combat.zombiesRemaining) : 0;
    for (let i = 0; i < zCount; i++) {
      const x = 268 - i * 22;
      const kind = zombieKindForSlot(combat!, i);
      let frameKey = zombieFrameKey(kind, tick, i, Boolean(hitAnim));
      if (now < this.deathBurstUntil && i === 0) {
        frameKey = kind === "boss" ? "zombie_boss_death" : `zombie_${kind}_death`;
      }
      const spr = this.add.image(x, 42, "sprites", frameKey).setScale(ZOMBIE_SCALE);
      spr.setFlipX(true);
      spr.setTint(ZOMBIE_TINT);
      spr.setDepth(3);
      this.zombieSprites.push(spr);
    }

    if (combat && now < this.deathBurstUntil && zCount === 0) {
      const kind = combat.isBoss ? "boss" : "walker";
      const key = kind === "boss" ? "zombie_boss_death" : `zombie_${kind}_death`;
      const spr = this.add.image(this.deathBurstX, 44, "sprites", key).setScale(ZOMBIE_SCALE * 0.95);
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

    const muzzle = this.add
      .image(from.x + 8, from.y - 11, "sprites", "muzzle_flash")
      .setScale(0.2)
      .setDepth(5);
    this.tweens.add({
      targets: muzzle,
      alpha: 0,
      scale: 0.28,
      duration: 90,
      ease: "Cubic.easeOut",
      onComplete: () => muzzle.destroy(),
    });

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
