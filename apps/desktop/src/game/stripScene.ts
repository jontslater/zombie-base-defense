import Phaser from "phaser";
import {
  companionDef,
  computeStripCombatSnapshot,
  captureStripCombatFxPrev,
  deriveStripCombatFxEvents,
  stripContactShadowMetrics,
  stripHordePresentation,
  stripHpBarCenterY,
  stripLocomotionOffset,
  stripMeleeLungeDx,
  stripSurvivorSpacingPx,
  stripSurvivorSpriteKey,
  stripSurvivorStartX,
  stripUnitAnchorY,
  stripZombieKindAtSlot,
  stripZombieSlotX,
  stripZombieSpriteKey,
  STRIP_GROUND_Y,
  STRIP_STRUCTURE_SCALE,
  STRIP_SURVIVOR_SCALE,
  STRIP_ZOMBIE_BOSS_SCALE,
  STRIP_ZOMBIE_SCALE,
  type StripCombatFxPrev,
  type StripCombatSnapshot,
  type StripSurvivorFramePhase,
} from "@zbd/sim";
import type { GameRuntime } from "./runtime";
import { StripBackdrop } from "./stripBackdrop";
import { StripCorePanel } from "./stripCorePanel";
import { StripHitFeel } from "./stripHitFeel";
import { StripHud } from "./stripHud";

const ZOMBIE_TINT = 0x8a9178;
const ZOMBIE_BOSS_TINT = 0x9a7aac;
const SURVIVOR_HP_COLOR = 0x58e858;
const SURVIVOR_HP_LOW = 0xe8a858;
const ZOMBIE_HP_COLOR = 0xe85858;
const UNIT_HP_W = 20;
const UNIT_HP_H = 3;

type ZombieSlot = {
  id: string;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  baseX: number;
  baseAnchorY: number;
  scale: number;
  boss: boolean;
  isFront: boolean;
};

type SurvivorSlot = {
  id: string;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseAnchorY: number;
  scale: number;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
};

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private survivorSlots: SurvivorSlot[] = [];
  private companionSprite: Phaser.GameObjects.Image | null = null;
  private companionShadow: Phaser.GameObjects.Ellipse | null = null;
  private zombieSlots: ZombieSlot[] = [];
  private hordeSilhouettes: Phaser.GameObjects.Image[] = [];
  private hordeBadge: Phaser.GameObjects.Text | null = null;
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;

  private fxPrev: StripCombatFxPrev | null = null;
  private layoutSig = "";
  private floatLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private hitFeel!: StripHitFeel;
  private backdrop!: StripBackdrop;
  private hud!: StripHud;
  private corePanel!: StripCorePanel;

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
    this.cameras.main.setBackgroundColor("#87b8d8");
    this.backdrop = new StripBackdrop(this);
    this.backdrop.create();
    this.hud = new StripHud(this);
    this.hud.create();
    this.corePanel = new StripCorePanel(this);
    this.corePanel.create();

    this.floatLayer = this.add.container(0, 0).setDepth(20);
    this.fxLayer = this.add.container(0, 0).setDepth(18);
    this.hitFeel = new StripHitFeel(this, this.fxLayer, this.floatLayer, () => this.rt.clientSettings);

    this.layoutStructures();

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
    this.refresh(true);
  }

  update() {
    this.hitFeel.tickFrame();
    const snap = computeStripCombatSnapshot(this.rt.state);
    this.backdrop.updateParallax(snap?.march01 ?? 0, snap?.swayRad ?? 0);
    this.applyUnitFxOffsets();
  }

  setRuntime(rt: GameRuntime) {
    this.rt = rt;
    this.resetStripTracking();
    this.refresh(true);
  }

  private resetStripTracking() {
    this.fxPrev = captureStripCombatFxPrev(this.rt.state);
    this.layoutSig = "";
    this.hitFeel?.reset();
  }

  private stripPosePhase(snap: StripCombatSnapshot | null): StripSurvivorFramePhase {
    const p = snap?.framePhase ?? 0;
    if (p === 1) return "attack";
    if (p === 2) return "hurt";
    return "idle";
  }

  private stripZombiePosePhase(snap: StripCombatSnapshot | null): "walk" | "attack" | "die" {
    const p = snap?.framePhase ?? 0;
    if (p === 1) return "attack";
    if (p === 2) return "die";
    return "walk";
  }

  private plantSprite(spr: Phaser.GameObjects.Image, x: number, scale: number) {
    spr.setOrigin(0.5, 1);
    spr.setScale(scale);
    spr.setPosition(x, stripUnitAnchorY(scale));
  }

  private makeShadow(x: number, scale: number, isBoss: boolean): Phaser.GameObjects.Ellipse {
    const m = stripContactShadowMetrics(scale, isBoss);
    return this.add.ellipse(x, STRIP_GROUND_Y - 4, m.width, m.height, 0x1a2010, m.alpha).setDepth(2);
  }

  private addUnitHpBar(x: number, anchorY: number, scale: number, ratio: number, ally: boolean) {
    const top = stripHpBarCenterY(anchorY, scale, 3, UNIT_HP_H);
    const back = this.add
      .rectangle(x, top, UNIT_HP_W, UNIT_HP_H, 0x1a1510, 0.85)
      .setOrigin(0.5, 0.5)
      .setDepth(9);
    const color = ally ? (ratio > 0.35 ? SURVIVOR_HP_COLOR : SURVIVOR_HP_LOW) : ZOMBIE_HP_COLOR;
    const fill = this.add
      .rectangle(x - UNIT_HP_W / 2, top, UNIT_HP_W * ratio, UNIT_HP_H - 1, color)
      .setOrigin(0, 0.5)
      .setDepth(10);
    return { back, fill };
  }

  private layoutStructures() {
    /* base drawn in StripCorePanel */
  }

  private layoutWallsAndTurrets() {
    for (const w of this.wallSprites) w.destroy();
    for (const t of this.turretSprites) t.destroy();
    this.wallSprites = [];
    this.turretSprites = [];

    const wallLevel = this.rt.state.upgrades.wall;
    for (let i = 0; i < wallLevel; i++) {
      const x = 318 - i * 22;
      const spr = this.add.image(x, STRIP_GROUND_Y - 5, "sprites", "wall");
      spr.setOrigin(0.5, 1).setScale(STRIP_STRUCTURE_SCALE * 0.85).setDepth(0);
      this.wallSprites.push(spr);
    }

    const turretLevel = this.rt.state.upgrades.turret;
    for (let i = 0; i < turretLevel; i++) {
      const x = 348 - i * 16;
      const spr = this.add.image(x, STRIP_GROUND_Y - 14 - i * 3, "sprites", "turret");
      spr.setOrigin(0.5, 1).setScale(STRIP_STRUCTURE_SCALE * 0.55).setDepth(2);
      this.turretSprites.push(spr);
    }
  }

  private clearCombatants() {
    for (const s of this.survivorSlots) {
      s.sprite.destroy();
      s.shadow.destroy();
      s.hpBack.destroy();
      s.hpFill.destroy();
    }
    for (const z of this.zombieSlots) {
      z.sprite.destroy();
      z.shadow.destroy();
      z.hpBack.destroy();
      z.hpFill.destroy();
    }
    for (const sh of this.hordeSilhouettes) sh.destroy();
    if (this.companionSprite) {
      this.companionSprite.destroy();
      this.companionSprite = null;
    }
    if (this.companionShadow) {
      this.companionShadow.destroy();
      this.companionShadow = null;
    }
    if (this.hordeBadge) {
      this.hordeBadge.destroy();
      this.hordeBadge = null;
    }
    this.survivorSlots = [];
    this.zombieSlots = [];
    this.hordeSilhouettes = [];
  }

  private combatLayoutSignature(snap: StripCombatSnapshot | null): string {
    const survivors = this.rt.state.survivors;
    const roles = survivors.map((s) => s.role).join(",");
    const hp = survivors.map((s) => Math.floor(s.hp)).join(",");
    const horde = snap
      ? stripHordePresentation(snap.zombiesRemaining, snap.isBoss)
      : { visibleSlots: 0, overflow: 0 };
    const z = snap
      ? `${snap.isBoss}:${snap.zombiesRemaining}:${snap.framePhase}:${horde.visibleSlots}`
      : "idle";
    return `${survivors.length}|${roles}|${hp}|${z}`;
  }

  private layoutCombatants(snap: StripCombatSnapshot | null, force = false) {
    const sig = this.combatLayoutSignature(snap);
    if (!force && sig === this.layoutSig) {
      this.syncCombatantFrames(snap);
      return;
    }
    this.layoutSig = sig;
    this.clearCombatants();

    const survivors = this.rt.state.survivors;
    const spacing = stripSurvivorSpacingPx(survivors.length);
    const teamX0 = stripSurvivorStartX(survivors.length);
    const pose = this.stripPosePhase(snap);

    survivors.forEach((sv, i) => {
      const x = teamX0 + i * spacing;
      const anchorY = stripUnitAnchorY(STRIP_SURVIVOR_SCALE);
      const locPose = pose === "attack" ? "attack" : snap ? "idle" : "idle";
      const loco = stripLocomotionOffset(snap, i, locPose);
      loco.dx += stripMeleeLungeDx(sv.role, pose === "attack");
      const key = stripSurvivorSpriteKey(sv.role, i, pose);
      const spr = this.add.image(x, anchorY, "sprites", key);
      this.plantSprite(spr, x, STRIP_SURVIVOR_SCALE);
      spr.setScale(STRIP_SURVIVOR_SCALE * loco.scaleX, STRIP_SURVIVOR_SCALE * loco.scaleY);
      spr.setTint(0xfff8f0);
      spr.setDepth(4);
      const shadow = this.makeShadow(x, STRIP_SURVIVOR_SCALE, false);
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      const hp = this.addUnitHpBar(x, anchorY, STRIP_SURVIVOR_SCALE, ratio, true);
      this.survivorSlots.push({
        id: `sv-${i}`,
        sprite: spr,
        shadow,
        baseX: x,
        baseAnchorY: anchorY,
        scale: STRIP_SURVIVOR_SCALE,
        hpBack: hp.back,
        hpFill: hp.fill,
      });
    });

    const ec = this.rt.state.equippedCompanionId
      ? companionDef(this.rt.state.equippedCompanionId)
      : undefined;
    if (snap && ec && this.rt.state.companionsUnlocked[ec.id]) {
      const cScale = 0.24;
      const cx = teamX0 + survivors.length * spacing + 8;
      this.companionSprite = this.add.image(cx, stripUnitAnchorY(cScale), "sprites", ec.spriteKey);
      this.companionSprite.setOrigin(0.5, 1).setScale(cScale).setTint(0xfff8f0).setDepth(5);
      this.companionShadow = this.makeShadow(cx, cScale, false);
    }

    if (!snap) return;

    const horde = stripHordePresentation(snap.zombiesRemaining, snap.isBoss);
    const nVisible = horde.visibleSlots;
    const zPose = this.stripZombiePosePhase(snap);

    for (let i = 0; i < horde.silhouettes; i++) {
      const x = stripZombieSlotX(0, nVisible, snap.isBoss) + 28 + i * 16;
      const kind = stripZombieKindAtSlot(snap, Math.min(i + 1, nVisible - 1), nVisible);
      const sil = this.add
        .image(x, stripUnitAnchorY(STRIP_ZOMBIE_SCALE * 0.92), "sprites", stripZombieSpriteKey(kind, "walk"))
        .setOrigin(0.5, 1)
        .setScale(STRIP_ZOMBIE_SCALE * 0.88)
        .setTint(0x5a6050)
        .setAlpha(0.28)
        .setFlipX(true)
        .setDepth(2);
      this.hordeSilhouettes.push(sil);
    }

    if (horde.overflow > 0) {
      this.hordeBadge = this.add
        .text(352, 6, `+${horde.overflow}`, {
          fontSize: "9px",
          color: "#ffe8a8",
          backgroundColor: "#2a2218cc",
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 0)
        .setDepth(30);
    }

    for (let i = 0; i < nVisible; i++) {
      const boss = snap.isBoss && i === 0;
      const scale = boss ? STRIP_ZOMBIE_BOSS_SCALE : STRIP_ZOMBIE_SCALE;
      const anchorY = stripUnitAnchorY(scale);
      const x = stripZombieSlotX(i, nVisible, snap.isBoss);
      const isFront = i === 0;
      const zPoseLoc = zPose === "walk" ? "walk" : zPose === "attack" ? "attack" : "hurt";
      const loco = stripLocomotionOffset(snap, i + 10, zPoseLoc, boss);
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      const zKey = stripZombieSpriteKey(kind, zPose);
      const spr = this.add.image(x, anchorY, "sprites", zKey);
      this.plantSprite(spr, x, scale);
      spr.setScale(scale * loco.scaleX, scale * loco.scaleY);
      spr.setFlipX(true);
      spr.setTint(boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT);
      spr.setDepth(boss ? 5 : 4);
      const shadow = this.makeShadow(x, scale, boss);
      let zRatio = 1;
      if (isFront) {
        zRatio = Math.max(0, Math.min(1, snap.currentZombieHp / Math.max(1, snap.zombieHpPerKill)));
      }
      const hp = this.addUnitHpBar(x, anchorY, scale, zRatio, false);
      this.zombieSlots.push({
        id: `z-${i}`,
        sprite: spr,
        shadow,
        hpBack: hp.back,
        hpFill: hp.fill,
        baseX: x,
        baseAnchorY: anchorY,
        scale,
        boss,
        isFront,
      });
    }
  }

  private syncCombatantFrames(snap: StripCombatSnapshot | null) {
    const pose = this.stripPosePhase(snap);
    const survivors = this.rt.state.survivors;
    const spacing = stripSurvivorSpacingPx(survivors.length);
    survivors.forEach((sv, i) => {
      const slot = this.survivorSlots[i];
      if (!slot) return;
      const key = stripSurvivorSpriteKey(sv.role, i, pose);
      slot.sprite.setTexture("sprites", key);
      slot.baseX = stripSurvivorStartX(survivors.length) + i * spacing;
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      slot.hpFill.width = UNIT_HP_W * ratio;
      slot.hpFill.fillColor = ratio > 0.35 ? SURVIVOR_HP_COLOR : SURVIVOR_HP_LOW;
    });

    if (!snap) return;
    const horde = stripHordePresentation(snap.zombiesRemaining, snap.isBoss);
    const nVisible = this.zombieSlots.length;
    if (nVisible !== horde.visibleSlots) {
      this.layoutCombatants(snap, true);
      return;
    }

    const zPose = this.stripZombiePosePhase(snap);
    this.zombieSlots.forEach((slot, i) => {
      slot.baseX = stripZombieSlotX(i, nVisible, snap.isBoss);
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      slot.sprite.setTexture("sprites", stripZombieSpriteKey(kind, zPose));
      if (slot.isFront) {
        const zRatio = Math.max(
          0,
          Math.min(1, snap.currentZombieHp / Math.max(1, snap.zombieHpPerKill)),
        );
        slot.hpFill.width = UNIT_HP_W * zRatio;
      }
    });
  }

  private applyUnitFxOffsets() {
    const snap = computeStripCombatSnapshot(this.rt.state);

    for (const s of this.survivorSlots) {
      const fx = this.hitFeel.getUnitOffset(s.id);
      const pose = this.stripPosePhase(snap);
      const idx = Number(s.id.split("-")[1]);
      const sv = this.rt.state.survivors[idx];
      const locPose = pose === "attack" ? "attack" : pose === "hurt" ? "hurt" : "idle";
      const loco = stripLocomotionOffset(snap, idx, locPose);
      const lunge = sv ? stripMeleeLungeDx(sv.role, pose === "attack") : 0;
      const x = s.baseX + fx.dx + loco.dx + lunge;
      const y = s.baseAnchorY + loco.dy;
      const top = stripHpBarCenterY(y, s.scale, 3, UNIT_HP_H);
      if (!fx.frozen) {
        s.sprite.setPosition(x, y);
        s.sprite.setScale(s.scale * loco.scaleX, s.scale * loco.scaleY);
        s.hpBack.setPosition(x, top);
        s.hpFill.setPosition(x - UNIT_HP_W / 2, top);
        s.shadow.setPosition(x, STRIP_GROUND_Y - 4);
      }
      this.hitFeel.applySpriteTint(s.sprite, s.id, 0xfff8f0);
    }

    for (const z of this.zombieSlots) {
      const fx = this.hitFeel.getUnitOffset(z.id);
      const zPose = this.stripZombiePosePhase(snap);
      const loco = stripLocomotionOffset(
        snap,
        Number(z.id.split("-")[1] ?? 0) + 10,
        zPose === "walk" ? "walk" : zPose === "attack" ? "attack" : "hurt",
        z.boss,
      );
      const x = z.baseX + fx.dx + loco.dx;
      const y = z.baseAnchorY + loco.dy;
      const top = stripHpBarCenterY(y, z.scale, 3, UNIT_HP_H);
      if (!fx.frozen) {
        z.sprite.setPosition(x, y);
        z.sprite.setScale(z.scale * loco.scaleX, z.scale * loco.scaleY);
        z.hpBack.setPosition(x, top);
        z.hpFill.setPosition(x - UNIT_HP_W / 2, top);
        z.shadow.setPosition(x, STRIP_GROUND_Y - 4);
      }
      const tint = z.boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
      this.hitFeel.applySpriteTint(z.sprite, z.id, tint);
    }

    if (this.companionSprite && this.companionShadow) {
      const survivors = this.rt.state.survivors.length;
      const spacing = stripSurvivorSpacingPx(survivors);
      const cScale = 0.24;
      const cx = stripSurvivorStartX(survivors) + survivors * spacing + 8;
      const cy = stripUnitAnchorY(cScale);
      this.companionSprite.setPosition(cx, cy);
      this.companionShadow.setPosition(cx, STRIP_GROUND_Y - 4);
    }
  }

  private spawnCurrencyFloat(x: number, y: number, amount: number) {
    if (amount <= 0) return;
    const t = this.add
      .text(x, y - 14, `+${amount}c`, {
        fontSize: "9px",
        color: "#ffd966",
        stroke: "#1a1510",
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
    const prev = this.fxPrev;

    if (snap && prev) {
      const events = deriveStripCombatFxEvents(prev, state, snap);
      const frontZ = this.zombieSlots.find((z) => z.isFront) ?? this.zombieSlots[0];
      for (const ev of events) {
        const attackerIdx = ev.kind === "zombie_hit" ? ev.attackerIndex : 0;
        const atkSlot = this.survivorSlots[attackerIdx] ?? this.survivorSlots[0];
        const survSlot =
          ev.kind === "survivor_hurt" ? this.survivorSlots[ev.survivorIndex] : undefined;
        this.hitFeel.applyEvent(ev, {
          zombieFront: frontZ
            ? {
                id: frontZ.id,
                x: frontZ.baseX,
                y: frontZ.baseAnchorY,
                sprite: frontZ.sprite,
                boss: frontZ.boss,
              }
            : undefined,
          survivor: survSlot
            ? { id: survSlot.id, x: survSlot.baseX, y: survSlot.baseAnchorY, sprite: survSlot.sprite }
            : undefined,
          attacker: atkSlot
            ? { id: atkSlot.id, x: atkSlot.baseX, y: atkSlot.baseAnchorY, sprite: atkSlot.sprite }
            : undefined,
        });
      }

      if (prev.zombiesRemaining > (snap.zombiesRemaining ?? 0)) {
        const killed = prev.zombiesRemaining - snap.zombiesRemaining;
        const target = this.zombieSlots[this.zombieSlots.length - 1] ?? this.zombieSlots[0];
        if (target) {
          const killPts = 2 + Math.floor(state.wave * 0.5);
          const feetY = target.baseAnchorY - 8 * target.scale;
          this.spawnCurrencyFloat(target.baseX, feetY, killPts * killed);
        }
      }
    }

    this.fxPrev = captureStripCombatFxPrev(state);
    if (snap) this.maybePlayHitSound();
    this.refresh(false);
  }

  refresh(forceLayout = false) {
    this.layoutWallsAndTurrets();

    const s = this.rt.state;
    const snap = computeStripCombatSnapshot(s);
    this.layoutCombatants(snap, forceLayout);
    this.applyUnitFxOffsets();
    this.hud.update(s, snap);
    this.corePanel.update(s.baseCoreHp, s.baseCoreMaxHp);
  }
}

export function createPhaserGame(parent: HTMLElement, _runtime: GameRuntime): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    width: 400,
    height: 80,
    parent,
    backgroundColor: "#87b8d8",
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
