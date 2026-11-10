import Phaser from "phaser";
import {
  bloodDropletSpawnCount,
  isStripMeleeRole,
  knockbackEaseOut,
  shouldMergeStripDamageNumber,
  shouldSpawnStripDamageNumber,
  stripHitFlashEnabled,
  stripScreenShakeEnabled,
  STRIP_HIT_FLASH_FRAMES,
  STRIP_HIT_STOP_FRAMES,
  STRIP_IMPACT_SPARK_FRAMES,
  STRIP_KILL_HIT_STOP_FRAMES,
  STRIP_KNOCKBACK_OUT_FRAMES,
  STRIP_KNOCKBACK_PX,
  STRIP_KNOCKBACK_RETURN_FRAMES,
  STRIP_SCREEN_SHAKE_PX,
  STRIP_SCREEN_SHAKE_SETTLE_FRAMES,
  type ClientSettings,
  type StripCombatFxEvent,
} from "@zbd/sim";

const ZOMBIE_TINT = 0x6ecf5a;
const ZOMBIE_BOSS_TINT = 0xc084fc;

type UnitFxState = {
  hitStopFrames: number;
  knockbackPhase: "out" | "return" | "none";
  knockbackFrame: number;
  knockbackDir: number;
  flashFrames: number;
  slowMoFrames: number;
  restoreTint: number;
};

type FloatEntry = { x: number; obj: Phaser.GameObjects.Text };

export class StripHitFeel {
  private unitFx = new Map<string, UnitFxState>();
  private shakeFrames = 0;
  private shakeAmp = 0;
  private bloodActive = 0;
  private floatActive: FloatEntry[] = [];
  private frame = 0;

  constructor(
    private scene: Phaser.Scene,
    private fxLayer: Phaser.GameObjects.Container,
    private floatLayer: Phaser.GameObjects.Container,
    private getSettings: () => ClientSettings,
  ) {}

  reset() {
    this.unitFx.clear();
    this.shakeFrames = 0;
    this.shakeAmp = 0;
    this.bloodActive = 0;
    this.floatActive = [];
    this.scene.cameras.main.setScroll(0, 0);
  }

  tickFrame() {
    this.frame += 1;
    for (const [id, st] of this.unitFx) {
      if (st.hitStopFrames > 0) st.hitStopFrames -= 1;
      if (st.flashFrames > 0) st.flashFrames -= 1;
      if (st.slowMoFrames > 0) st.slowMoFrames -= 1;
      if (st.knockbackPhase !== "none") {
        st.knockbackFrame += 1;
        const limit =
          st.knockbackPhase === "out" ? STRIP_KNOCKBACK_OUT_FRAMES : STRIP_KNOCKBACK_RETURN_FRAMES;
        if (st.knockbackFrame >= limit) {
          if (st.knockbackPhase === "out") {
            st.knockbackPhase = "return";
            st.knockbackFrame = 0;
          } else {
            st.knockbackPhase = "none";
            st.knockbackFrame = 0;
          }
        }
      }
      if (
        st.hitStopFrames === 0 &&
        st.flashFrames === 0 &&
        st.knockbackPhase === "none" &&
        st.slowMoFrames === 0
      ) {
        this.unitFx.delete(id);
      } else {
        this.unitFx.set(id, st);
      }
      void id;
    }

    if (this.shakeFrames > 0 && stripScreenShakeEnabled(this.getSettings())) {
      this.shakeFrames -= 1;
      const t = this.shakeFrames / STRIP_SCREEN_SHAKE_SETTLE_FRAMES;
      const amp = this.shakeAmp * t;
      const sx = (Math.sin(this.frame * 1.7) * amp) | 0;
      const sy = (Math.cos(this.frame * 2.3) * amp * 0.6) | 0;
      this.scene.cameras.main.setScroll(sx, sy);
    } else if (this.shakeFrames <= 0) {
      this.scene.cameras.main.setScroll(0, 0);
    }
  }

  getUnitOffset(id: string): { dx: number; dy: number; frozen: boolean; tintWhite: boolean } {
    const st = this.unitFx.get(id);
    if (!st) return { dx: 0, dy: 0, frozen: false, tintWhite: false };
    let dx = 0;
    if (st.knockbackPhase === "out") {
      const t = knockbackEaseOut(st.knockbackFrame / STRIP_KNOCKBACK_OUT_FRAMES);
      dx = st.knockbackDir * STRIP_KNOCKBACK_PX * t;
    } else if (st.knockbackPhase === "return") {
      const t = knockbackEaseOut(1 - st.knockbackFrame / STRIP_KNOCKBACK_RETURN_FRAMES);
      dx = st.knockbackDir * STRIP_KNOCKBACK_PX * t;
    }
    return {
      dx,
      dy: 0,
      frozen: st.hitStopFrames > 0,
      tintWhite: stripHitFlashEnabled(this.getSettings()) && st.flashFrames > 0,
    };
  }

  private ensureUnit(id: string, restoreTint: number): UnitFxState {
    const prev = this.unitFx.get(id);
    if (prev) return prev;
    const st: UnitFxState = {
      hitStopFrames: 0,
      knockbackPhase: "none",
      knockbackFrame: 0,
      knockbackDir: 1,
      flashFrames: 0,
      slowMoFrames: 0,
      restoreTint,
    };
    this.unitFx.set(id, st);
    return st;
  }

  applyEvent(
    ev: StripCombatFxEvent,
    targets: {
      zombieFront?: { id: string; x: number; y: number; sprite: Phaser.GameObjects.Image; boss: boolean };
      survivor?: { id: string; x: number; y: number; sprite: Phaser.GameObjects.Image };
      attacker?: { id: string; x: number; y: number; sprite: Phaser.GameObjects.Image };
    },
  ) {
    const settings = this.getSettings();

    if (ev.kind === "zombie_hit") {
      const z = targets.zombieFront;
      if (!z) return;
      const tint = z.boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
      const st = this.ensureUnit(z.id, tint);
      st.hitStopFrames = Math.max(
        st.hitStopFrames,
        ev.killing ? STRIP_KILL_HIT_STOP_FRAMES : STRIP_HIT_STOP_FRAMES,
      );
      if (ev.killing) st.slowMoFrames = 6;
      st.knockbackDir = 1;
      st.knockbackPhase = "out";
      st.knockbackFrame = 0;
      if (stripHitFlashEnabled(settings)) st.flashFrames = STRIP_HIT_FLASH_FRAMES;
      this.spawnImpactSpark(z.x, z.y - 4);
      this.spawnBlood(z.x, z.y, z.boss);
      this.spawnDamageNumber(z.x, z.y - 6, ev.damage, "#ff7a7a");

      const atk = targets.attacker;
      if (atk) {
        const ast = this.ensureUnit(atk.id, 0xffffff);
        ast.hitStopFrames = Math.max(ast.hitStopFrames, STRIP_HIT_STOP_FRAMES);
        if (isStripMeleeRole(ev.attackerRole)) {
          this.spawnSlashTrail(atk.x, atk.y, atk.sprite);
        } else {
          this.spawnMuzzleFlash(atk.x, atk.y);
        }
      }
    }

    if (ev.kind === "zombie_kill") {
      const z = targets.zombieFront;
      if (z) {
        const tint = z.boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
        const st = this.ensureUnit(z.id, tint);
        st.hitStopFrames = Math.max(st.hitStopFrames, STRIP_KILL_HIT_STOP_FRAMES);
        st.slowMoFrames = 6;
      }
      if (
        stripScreenShakeEnabled(settings) &&
        (ev.isBossWave || ev.zombieKind === "brute")
      ) {
        this.shakeAmp = STRIP_SCREEN_SHAKE_PX;
        this.shakeFrames = STRIP_SCREEN_SHAKE_SETTLE_FRAMES;
      }
    }

    if (ev.kind === "survivor_hurt") {
      const s = targets.survivor;
      if (s) {
        const st = this.ensureUnit(s.id, 0xffffff);
        st.hitStopFrames = Math.max(st.hitStopFrames, STRIP_HIT_STOP_FRAMES);
        st.knockbackDir = -1;
        st.knockbackPhase = "out";
        st.knockbackFrame = 0;
        if (stripHitFlashEnabled(settings)) st.flashFrames = STRIP_HIT_FLASH_FRAMES;
        this.spawnDamageNumber(s.x, s.y - 6, ev.damage, "#ffaaaa");
      }
      if (stripScreenShakeEnabled(settings) && ev.isBossWave) {
        this.shakeAmp = Math.min(STRIP_SCREEN_SHAKE_PX, 1.5);
        this.shakeFrames = STRIP_SCREEN_SHAKE_SETTLE_FRAMES;
      }
    }

    if (ev.kind === "core_hit" && stripScreenShakeEnabled(settings) && ev.isBossWave) {
      this.shakeAmp = Math.min(STRIP_SCREEN_SHAKE_PX, 1.5);
      this.shakeFrames = STRIP_SCREEN_SHAKE_SETTLE_FRAMES;
    }
  }

  applySpriteTint(sprite: Phaser.GameObjects.Image, id: string, baseTint: number) {
    const st = this.unitFx.get(id);
    if (st && stripHitFlashEnabled(this.getSettings()) && st.flashFrames > 0) {
      sprite.setTint(0xffffff);
    } else if (baseTint !== 0xffffff) {
      sprite.setTint(baseTint);
    } else {
      sprite.clearTint();
    }
  }

  onDamageFloatDone(entry: FloatEntry) {
    this.floatActive = this.floatActive.filter((f) => f.obj !== entry.obj);
  }

  private spawnImpactSpark(x: number, y: number) {
    const spark = this.scene.add
      .image(x, y, "sprites", "hit")
      .setScale(0.11)
      .setDepth(13)
      .setTint(0xffeeaa);
    this.fxLayer.add(spark);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scale: spark.scaleX * 1.4,
      duration: (STRIP_IMPACT_SPARK_FRAMES / 30) * 1000,
      ease: "Cubic.Out",
      onComplete: () => {
        this.fxLayer.remove(spark, true);
        spark.destroy();
      },
    });
  }

  private spawnBlood(x: number, y: number, isBoss: boolean) {
    const n = bloodDropletSpawnCount(this.bloodActive);
    if (n <= 0) return;
    this.bloodActive += n;
    for (let i = 0; i < n; i++) {
      const p = this.scene.add
        .image(x, y - 2, "sprites", "hit")
        .setScale(isBoss ? 0.08 : 0.06)
        .setDepth(11)
        .setTint(0xb32d2d);
      this.fxLayer.add(p);
      const ang = (i / n) * Math.PI * 2 + y * 0.02;
      const dist = 5 + (i % 4) * 2.5;
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist - 6,
        alpha: 0,
        duration: 280 + (i % 5) * 20,
        ease: "Cubic.Out",
        onComplete: () => {
          this.bloodActive = Math.max(0, this.bloodActive - 1);
          this.fxLayer.remove(p, true);
          p.destroy();
        },
      });
    }
  }

  private spawnSlashTrail(x: number, y: number, attacker: Phaser.GameObjects.Image) {
    const trail = this.scene.add
      .image(x + 8, y - 8, "sprites", "hit")
      .setScale(0.14, 0.06)
      .setAngle(-35)
      .setAlpha(0.55)
      .setDepth(10)
      .setTint(0xaaddff);
    this.fxLayer.add(trail);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: trail.scaleX * 1.6,
      duration: 120,
      ease: "Quad.Out",
      onComplete: () => {
        this.fxLayer.remove(trail, true);
        trail.destroy();
      },
    });
    this.scene.tweens.add({
      targets: attacker,
      angle: 14,
      duration: 70,
      yoyo: true,
      ease: "Sine.InOut",
    });
  }

  private spawnMuzzleFlash(x: number, y: number) {
    const flash = this.scene.add
      .image(x + 10, y - 6, "sprites", "muzzle")
      .setScale(0.14)
      .setFlipX(true)
      .setDepth(12);
    this.fxLayer.add(flash);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: flash.scaleX * 1.35,
      duration: 90,
      ease: "Cubic.Out",
      onComplete: () => {
        this.fxLayer.remove(flash, true);
        flash.destroy();
      },
    });
  }

  private spawnDamageNumber(x: number, y: number, amount: number, color: string) {
    const cols = this.floatActive.map((f) => f.x);
    if (
      !shouldSpawnStripDamageNumber(this.floatActive.length) ||
      shouldMergeStripDamageNumber(this.floatActive.length, cols, x)
    ) {
      return;
    }
    const t = this.scene.add
      .text(x, y - 16, `-${amount.toFixed(0)}`, {
        fontSize: "10px",
        color,
        stroke: "#0b0f14",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(15);
    this.floatLayer.add(t);
    this.floatActive.push({ x, obj: t });
    this.scene.tweens.add({
      targets: t,
      y: y - 32,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 90,
      yoyo: true,
      ease: "Quad.Out",
    });
    this.scene.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 420,
      delay: 120,
      ease: "Cubic.Out",
      onComplete: () => {
        this.onDamageFloatDone({ x, obj: t });
        this.floatLayer.remove(t, false);
        t.destroy();
      },
    });
  }
}
