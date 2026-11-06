import Phaser from "phaser";
import {
  companionDef,
  computeStripCombatSnapshot,
  perimeterUnlockedCount,
  stripCampaignTag,
  type StripCombatSnapshot,
} from "@zbd/sim";
import type { GameRuntime } from "./runtime";

const SURVIVOR_SCALE = 0.52;
const ZOMBIE_SCALE = 0.52;
const STRUCTURE_SCALE = 0.42;
const ZOMBIE_TINT = 0x6ecf5a;
const ZOMBIE_BOSS_TINT = 0xc084fc;
const ZOMBIE_BOSS_SCALE = 0.62;
const CORE_HP_BAR_Y = 62;

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private survivorSprites: Phaser.GameObjects.Image[] = [];
  private survivorHpBars: { back: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }[] =
    [];
  /** TBH companion: drawn above survivors/zombies during combat when equipped + unlocked. */
  private companionSprite: Phaser.GameObjects.Image | null = null;
  private zombieSprites: Phaser.GameObjects.Image[] = [];
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;

  private prevTick = -1;
  private prevCombatZombies = -1;
  private prevSurvivorHp: number[] = [];
  private prevCoreHp = -1;
  private floatLayer!: Phaser.GameObjects.Container;

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

    this.floatLayer = this.add.container(0, 0).setDepth(20);

    this.layoutStructures();

    this.add.rectangle(200, CORE_HP_BAR_Y, 360, 8, 0x2a3544).setDepth(5);
    this.barHp = this.add
      .rectangle(22, CORE_HP_BAR_Y, 360, 8, 0x3d8bfd)
      .setOrigin(0, 0.5)
      .setDepth(6);

    this.label = this.add
      .text(200, 8, "", { fontSize: "11px", color: "#e8eef5" })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.hitSound = this.sound.add("hit", { volume: 0.35 });

    this.input.on("pointerdown", () => {
      this.game.events.emit("toggle-panel");
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.onStripTick(),
    });

    this.resetStripTracking();
    this.refresh();
  }

  setRuntime(rt: GameRuntime) {
    this.rt = rt;
    this.resetStripTracking();
    this.refresh();
  }

  private resetStripTracking() {
    this.prevTick = -1;
    this.prevCombatZombies = -1;
    this.prevSurvivorHp = [];
    this.prevCoreHp = -1;
  }

  private hash01(seed: number, salt: number): number {
    let x = (seed >>> 0) ^ (salt * 2654435761);
    x ^= x >>> 16;
    x = Math.imul(x, 2246822519);
    x ^= x >>> 13;
    x = Math.imul(x, 3266489917);
    return (x >>> 0) / 4294967296;
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

  private clearCombatants() {
    for (const s of this.survivorSprites) s.destroy();
    for (const b of this.survivorHpBars) {
      b.back.destroy();
      b.fill.destroy();
    }
    for (const z of this.zombieSprites) z.destroy();
    if (this.companionSprite) {
      this.companionSprite.destroy();
      this.companionSprite = null;
    }
    this.survivorSprites = [];
    this.survivorHpBars = [];
    this.zombieSprites = [];
  }

  private layoutCombatants(snap: StripCombatSnapshot | null) {
    this.clearCombatants();

    const survivors = this.rt.state.survivors;
    survivors.forEach((sv, i) => {
      const x = 22 + i * 22;
      const swayBase = snap?.swayRad ?? 0;
      const y = 42 + Math.sin(swayBase + i * 0.7) * 1.2;
      const key = i % 2 === 0 ? "survivor" : "survivor_alt";
      const spr = this.add.image(x, y, "sprites", key).setScale(SURVIVOR_SCALE);
      spr.setFlipX(false);
      spr.setDepth(3);
      this.survivorSprites.push(spr);

      const hpW = 26;
      const hpBack = this.add
        .rectangle(x, y - 22, hpW, 4, 0x2a3544)
        .setOrigin(0.5, 0.5)
        .setDepth(7);
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      const hpFill = this.add
        .rectangle(x - hpW / 2, y - 22, hpW * ratio, 3, ratio > 0.35 ? 0x3d8bfd : 0xe74c3c)
        .setOrigin(0, 0.5)
        .setDepth(8);
      this.survivorHpBars.push({ back: hpBack, fill: hpFill });
    });

    const ec = this.rt.state.equippedCompanionId
      ? companionDef(this.rt.state.equippedCompanionId)
      : undefined;
    if (snap && ec && this.rt.state.companionsUnlocked[ec.id]) {
      const cx = 22 + survivors.length * 22 + 18;
      const swayBase = snap.swayRad;
      const cy = 36 + Math.sin(swayBase * 0.6) * 1.2;
      this.companionSprite = this.add
        .image(cx, cy, "sprites", ec.spriteKey)
        .setScale(0.22)
        .setDepth(5);
    }

    if (!snap) return;

    const zxMin = 120;
    const baseX = 348;
    const spread =
      snap.isBoss && snap.zombiesMax <= 4 ? Math.min(42, baseX - zxMin) : Math.min(200, baseX - zxMin);
    const nVisible = snap.isBoss ? Math.min(snap.zombiesRemaining, 5) : Math.min(snap.zombiesRemaining, 10);

    for (let i = 0; i < nVisible; i++) {
      const u = nVisible <= 1 ? 0.82 : i / Math.max(1, nVisible - 1);
      const xBase = zxMin + u * spread;
      const march =
        Math.sin((snap.march01 + u * 0.37 + i * 0.09) * Math.PI * 2) * (snap.isBoss ? 2 : 4);
      const x = Phaser.Math.Clamp(xBase + march, zxMin, baseX - 12);
      const y = 42 + Math.sin(snap.swayRad * 0.8 + i * 1.1) * (snap.isBoss ? 1.5 : 2.5);
      const spr = this.add.image(x, y, "sprites", "zombie").setScale(snap.isBoss ? ZOMBIE_BOSS_SCALE : ZOMBIE_SCALE);
      spr.setFlipX(true);
      spr.setTint(snap.isBoss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT);
      spr.setDepth(snap.isBoss ? 4 : 3);
      if (snap.isBoss) spr.setAlpha(0.98);

      this.zombieSprites.push(spr);
    }
  }

  private spawnMuzzleFlash(x: number, y: number) {
    const g = this.add.graphics().setDepth(12);
    g.fillStyle(0xffe066, 1);
    g.fillCircle(x + 10, y - 6, 4);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(x + 12, y - 8, 2);
    this.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.35,
      duration: 90,
      ease: "Cubic.Out",
      onComplete: () => g.destroy(),
    });
  }

  private swingWeapon(survivor: Phaser.GameObjects.Image) {
    this.tweens.add({
      targets: survivor,
      angle: 12,
      duration: 70,
      yoyo: true,
      ease: "Sine.InOut",
    });
  }

  private spawnHitParticles(x: number, y: number, isBoss: boolean) {
    const n = isBoss ? 10 : 6;
    const baseColor = isBoss ? 0xe8aaff : 0x7fd0ff;
    for (let i = 0; i < n; i++) {
      const p = this.add.circle(x, y, isBoss ? 2.2 : 1.6, baseColor, 0.95).setDepth(11);
      const ang = (i / n) * Math.PI * 2 + y * 0.01;
      const dist = 8 + (i % 3) * 4;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 4,
        alpha: 0,
        scale: 0,
        duration: 220 + i * 15,
        ease: "Cubic.Out",
        onComplete: () => p.destroy(),
      });
    }
  }

  private flashSprite(spr: Phaser.GameObjects.Image, flashColor: number, restoreTint: number) {
    spr.setTint(flashColor);
    this.time.delayedCall(90, () => spr.setTint(restoreTint));
  }

  private spawnDamageFloat(x: number, y: number, amount: number, color: string) {
    const t = this.add
      .text(x, y - 16, `-${amount.toFixed(0)}`, {
        fontSize: "10px",
        color,
        stroke: "#0b0f14",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(15);
    this.floatLayer.add(t);
    this.tweens.add({
      targets: t,
      y: y - 38,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => {
        this.floatLayer.remove(t, false);
        t.destroy();
      },
    });
  }

  private spawnCurrencyFloat(x: number, y: number, amount: number) {
    if (amount <= 0) return;
    const t = this.add
      .text(x, y - 14, `+${amount}c`, {
        fontSize: "9px",
        color: "#ffd966",
        stroke: "#0b0f14",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(15);
    this.floatLayer.add(t);
    this.tweens.add({
      targets: t,
      y: y - 34,
      alpha: 0,
      duration: 640,
      ease: "Quad.Out",
      onComplete: () => {
        this.floatLayer.remove(t, false);
        t.destroy();
      },
    });
  }

  private spawnProjectile(from: Phaser.GameObjects.Image, to: Phaser.GameObjects.Image) {
    const bullet = this.add
      .image(from.x + 8, from.y - 8, "sprites", "projectile")
      .setScale(0.16)
      .setDepth(9);
    this.tweens.add({
      targets: bullet,
      x: to.x - 6,
      y: to.y - 6,
      duration: 140,
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

  private onStripTick() {
    const state = this.rt.state;
    const snap = computeStripCombatSnapshot(state);
    const tick = state.tick;

    if (snap && this.prevTick >= 0 && tick > this.prevTick) {
      const nHit = Math.min(3, this.survivorSprites.length);
      for (let i = 0; i < nHit; i++) {
        const h = this.hash01(tick, i * 7919);
        if (h < 0.55) continue;
        const from = this.survivorSprites[i];
        const to =
          this.zombieSprites[
            Math.min(this.zombieSprites.length - 1, Math.floor(h * this.zombieSprites.length))
          ];
        if (!from || !to) continue;
        const alt = this.hash01(tick, i * 503 + 17) > 0.42;
        if (alt) {
          this.swingWeapon(from);
        } else {
          this.spawnMuzzleFlash(from.x, from.y);
          this.spawnProjectile(from, to);
        }
        this.spawnHitParticles(to.x, to.y - 4, snap.isBoss);
        this.flashSprite(to, snap.isBoss ? 0xffdddd : 0xffffff, snap.isBoss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT);
        this.spawnDamageFloat(to.x, to.y, snap.damagePerTick * (0.85 + h * 0.3), "#ff7a7a");
      }

    }

    if (snap && this.prevCombatZombies >= 0 && snap.zombiesRemaining < this.prevCombatZombies) {
      const killed = this.prevCombatZombies - snap.zombiesRemaining;
      const target = this.zombieSprites[this.zombieSprites.length - 1] ?? this.zombieSprites[0];
      if (target) {
        const killPts = 2 + Math.floor(state.wave * 0.5);
        const curDrop = killPts * killed;
        this.spawnCurrencyFloat(target.x, target.y - 8, curDrop);
        this.tweens.add({
          targets: target,
          alpha: 0,
          scale: target.scaleX * 0.4,
          angle: target.angle + (this.hash01(tick, 99) > 0.5 ? 40 : -40),
          duration: 280,
          ease: "Cubic.In",
          onComplete: () => {
            /* sprite cleared on next layout */
          },
        });
      }
    }

    if (snap) {
      const svs = state.survivors;
      for (let i = 0; i < svs.length; i++) {
        const prev = this.prevSurvivorHp[i];
        const cur = svs[i]!.hp;
        if (prev !== undefined && cur < prev) {
          const spr = this.survivorSprites[i];
          if (spr) {
            this.spawnDamageFloat(spr.x, spr.y, prev - cur, "#ffaaaa");
            this.flashSprite(spr, 0xff5555, 0xffffff);
          }
        }
      }
      if (this.prevCoreHp >= 0 && state.baseCoreHp < this.prevCoreHp) {
        this.spawnDamageFloat(200, CORE_HP_BAR_Y - 6, this.prevCoreHp - state.baseCoreHp, "#ff9966");
      }
    }

    this.prevTick = tick;
    this.prevCombatZombies = snap?.zombiesRemaining ?? -1;
    this.prevSurvivorHp = state.survivors.map((s) => s.hp);
    this.prevCoreHp = state.baseCoreHp;

    if (snap) this.maybePlayHitSound();
    this.refresh();
  }

  refresh() {
    this.layoutWallsAndTurrets();

    const s = this.rt.state;
    const snap = computeStripCombatSnapshot(s);
    this.layoutCombatants(snap);

    const hpRatio = Math.max(0, s.baseCoreHp / s.baseCoreMaxHp);
    this.barHp.width = 360 * hpRatio;
    this.barHp.fillColor = hpRatio > 0.35 ? 0x3d8bfd : 0xe74c3c;

    const combat = s.combat;
    const combatText = combat
      ? ` | Z:${combat.zombiesRemaining}${combat.isBoss ? " BOSS" : ""}`
      : " | idle";
    const camp = stripCampaignTag(s.currentStageKey);
    const perimeterN = perimeterUnlockedCount(s);
    const roles = s.survivors.map((x) => String(x.role).slice(0, 2).toUpperCase()).join("/");
    const dpsLine = snap ? ` | ${Math.floor(snap.dps)}dps` : "";
    const bossBanner = snap?.isBoss ? " | ★ BOSS WAVE ★" : "";
    this.label.setText(
      `${camp} | w${s.wave} | ${s.currency}c | ${roles} | Core ${Math.floor(s.baseCoreHp)}/${
        s.baseCoreMaxHp
      } | P${perimeterN}${dpsLine}${bossBanner}${combatText}`,
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
