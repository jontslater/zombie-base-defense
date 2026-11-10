import Phaser from "phaser";
import {
  companionDef,
  computeStripCombatSnapshot,
  captureStripCombatFxPrev,
  deriveStripCombatFxEvents,
  perimeterUnlockedCount,
  stripCampaignTag,
  stripContactShadowMetrics,
  stripLocomotionOffset,
  stripMeleeLungeDx,
  stripSurvivorSpriteKey,
  stripUnitAnchorY,
  stripZombieKindAtSlot,
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
import { StripHitFeel } from "./stripHitFeel";

const ZOMBIE_TINT = 0x6ecf5a;
const ZOMBIE_BOSS_TINT = 0xc084fc;
const CORE_HP_BAR_Y = 62;

type ZombieSlot = {
  id: string;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseAnchorY: number;
  scale: number;
  boss: boolean;
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
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private survivorSlots: SurvivorSlot[] = [];
  private companionSprite: Phaser.GameObjects.Image | null = null;
  private companionShadow: Phaser.GameObjects.Ellipse | null = null;
  private zombieSlots: ZombieSlot[] = [];
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private baseSprite: Phaser.GameObjects.Image | null = null;
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;

  private fxPrev: StripCombatFxPrev | null = null;
  private layoutSig = "";
  private floatLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private hitFeel!: StripHitFeel;
  private backdrop!: StripBackdrop;

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
    this.cameras.main.setBackgroundColor("#121820");
    this.backdrop = new StripBackdrop(this);
    this.backdrop.create();

    this.floatLayer = this.add.container(0, 0).setDepth(20);
    this.fxLayer = this.add.container(0, 0).setDepth(18);
    this.hitFeel = new StripHitFeel(this, this.fxLayer, this.floatLayer, () => this.rt.clientSettings);

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
    return this.add.ellipse(x, STRIP_GROUND_Y + 1, m.width, m.height, 0x000000, m.alpha).setDepth(2);
  }

  private layoutStructures() {
    if (this.baseSprite) this.baseSprite.destroy();
    this.baseSprite = this.add.image(378, STRIP_GROUND_Y + 2, "sprites", "base");
    this.baseSprite.setOrigin(0.5, 1).setScale(STRIP_STRUCTURE_SCALE).setDepth(1);
  }

  private layoutWallsAndTurrets() {
    for (const w of this.wallSprites) w.destroy();
    for (const t of this.turretSprites) t.destroy();
    this.wallSprites = [];
    this.turretSprites = [];

    const wallLevel = this.rt.state.upgrades.wall;
    for (let i = 0; i < wallLevel; i++) {
      const x = 318 - i * 22;
      const spr = this.add.image(x, STRIP_GROUND_Y + 1, "sprites", "wall");
      spr.setOrigin(0.5, 1).setScale(STRIP_STRUCTURE_SCALE * 0.85).setDepth(0);
      this.wallSprites.push(spr);
    }

    const turretLevel = this.rt.state.upgrades.turret;
    for (let i = 0; i < turretLevel; i++) {
      const x = 348 - i * 16;
      const spr = this.add.image(x, STRIP_GROUND_Y - 12 - i * 3, "sprites", "turret");
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
    }
    if (this.companionSprite) {
      this.companionSprite.destroy();
      this.companionSprite = null;
    }
    if (this.companionShadow) {
      this.companionShadow.destroy();
      this.companionShadow = null;
    }
    this.survivorSlots = [];
    this.zombieSlots = [];
  }

  private combatLayoutSignature(snap: StripCombatSnapshot | null): string {
    const survivors = this.rt.state.survivors;
    const roles = survivors.map((s) => s.role).join(",");
    const hp = survivors.map((s) => Math.floor(s.hp)).join(",");
    const z = snap
      ? `${snap.isBoss}:${snap.zombiesRemaining}:${snap.framePhase}`
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
    const pose = this.stripPosePhase(snap);
    survivors.forEach((sv, i) => {
      const x = 22 + i * 24;
      const anchorY = stripUnitAnchorY(STRIP_SURVIVOR_SCALE);
      const locPose = pose === "attack" ? "attack" : snap ? "idle" : "idle";
      const loco = stripLocomotionOffset(snap, i, locPose);
      loco.dx += stripMeleeLungeDx(sv.role, pose === "attack");
      const key = stripSurvivorSpriteKey(sv.role, i, pose);
      const spr = this.add.image(x + loco.dx, anchorY + loco.dy, "sprites", key);
      this.plantSprite(spr, x + loco.dx, STRIP_SURVIVOR_SCALE);
      spr.setScale(STRIP_SURVIVOR_SCALE * loco.scaleX, STRIP_SURVIVOR_SCALE * loco.scaleY);
      spr.setDepth(3);
      const shadow = this.makeShadow(x, STRIP_SURVIVOR_SCALE, false);
      const hpW = 26;
      const feetY = anchorY - 8 * STRIP_SURVIVOR_SCALE;
      const hpBack = this.add
        .rectangle(x, feetY - 18, hpW, 4, 0x2a3544)
        .setOrigin(0.5, 0.5)
        .setDepth(7);
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      const hpFill = this.add
        .rectangle(x - hpW / 2, feetY - 18, hpW * ratio, 3, ratio > 0.35 ? 0x3d8bfd : 0xe74c3c)
        .setOrigin(0, 0.5)
        .setDepth(8);
      this.survivorSlots.push({
        id: `sv-${i}`,
        sprite: spr,
        shadow,
        baseX: x,
        baseAnchorY: anchorY,
        scale: STRIP_SURVIVOR_SCALE,
        hpBack,
        hpFill,
      });
    });

    const ec = this.rt.state.equippedCompanionId
      ? companionDef(this.rt.state.equippedCompanionId)
      : undefined;
    if (snap && ec && this.rt.state.companionsUnlocked[ec.id]) {
      const cx = 22 + survivors.length * 24 + 16;
      const cScale = 0.26;
      this.companionSprite = this.add.image(cx, stripUnitAnchorY(cScale), "sprites", ec.spriteKey);
      this.companionSprite.setOrigin(0.5, 1).setScale(cScale).setDepth(5);
      this.companionShadow = this.makeShadow(cx, cScale, false);
    }

    if (!snap) return;

    const zxMin = 118;
    const baseX = 348;
    const spread =
      snap.isBoss && snap.zombiesMax <= 4 ? Math.min(42, baseX - zxMin) : Math.min(200, baseX - zxMin);
    const nVisible = snap.isBoss ? Math.min(snap.zombiesRemaining, 5) : Math.min(snap.zombiesRemaining, 10);
    const zPose = this.stripZombiePosePhase(snap);

    for (let i = 0; i < nVisible; i++) {
      const u = nVisible <= 1 ? 0.82 : i / Math.max(1, nVisible - 1);
      const xBase = zxMin + u * spread;
      const march =
        Math.sin((snap.march01 + u * 0.37 + i * 0.09) * Math.PI * 2) * (snap.isBoss ? 2 : 5);
      const x = Phaser.Math.Clamp(xBase + march, zxMin, baseX - 12);
      const boss = snap.isBoss && i === 0;
      const scale = boss ? STRIP_ZOMBIE_BOSS_SCALE : STRIP_ZOMBIE_SCALE;
      const anchorY = stripUnitAnchorY(scale);
      const loco = stripLocomotionOffset(
        snap,
        i + 10,
        zPose === "walk" ? "walk" : zPose === "attack" ? "attack" : "hurt",
        boss,
      );
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      const zKey = stripZombieSpriteKey(kind, zPose);
      const spr = this.add.image(x, anchorY, "sprites", zKey);
      this.plantSprite(spr, x, scale);
      spr.setScale(scale * loco.scaleX, scale * loco.scaleY);
      spr.setFlipX(true);
      spr.setTint(boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT);
      spr.setDepth(boss ? 4 : 3);
      const shadow = this.makeShadow(x, scale, boss);
      this.zombieSlots.push({
        id: `z-${i}`,
        sprite: spr,
        shadow,
        baseX: x,
        baseAnchorY: anchorY,
        scale,
        boss,
      });
    }
  }

  private syncCombatantFrames(snap: StripCombatSnapshot | null) {
    const pose = this.stripPosePhase(snap);
    const survivors = this.rt.state.survivors;
    survivors.forEach((sv, i) => {
      const slot = this.survivorSlots[i];
      if (!slot) return;
      const key = stripSurvivorSpriteKey(sv.role, i, pose);
      slot.sprite.setTexture("sprites", key);
      slot.baseX = 22 + i * 24;
      const locPose = pose === "attack" ? "attack" : pose === "hurt" ? "hurt" : snap ? "idle" : "idle";
      const loco = stripLocomotionOffset(snap, i, locPose);
      void loco;
      const hpW = 26;
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      slot.hpFill.width = hpW * ratio;
      slot.hpFill.fillColor = ratio > 0.35 ? 0x3d8bfd : 0xe74c3c;
    });

    if (!snap) return;
    const zPose = this.stripZombiePosePhase(snap);
    const zxMin = 118;
    const baseX = 348;
    const spread =
      snap.isBoss && snap.zombiesMax <= 4 ? Math.min(42, baseX - zxMin) : Math.min(200, baseX - zxMin);
    const nVisible = this.zombieSlots.length;
    const nRemaining = snap.zombiesRemaining;
    if (nVisible !== (snap.isBoss ? Math.min(nRemaining, 5) : Math.min(nRemaining, 10))) {
      this.layoutCombatants(snap, true);
      return;
    }

    this.zombieSlots.forEach((slot, i) => {
      const u = nVisible <= 1 ? 0.82 : i / Math.max(1, nVisible - 1);
      const xBase = zxMin + u * spread;
      const march =
        Math.sin((snap.march01 + u * 0.37 + i * 0.09) * Math.PI * 2) * (snap.isBoss ? 2 : 5);
      slot.baseX = Phaser.Math.Clamp(xBase + march, zxMin, baseX - 12);
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      slot.sprite.setTexture("sprites", stripZombieSpriteKey(kind, zPose));
    });
  }

  private applyUnitFxOffsets() {
    const snap = computeStripCombatSnapshot(this.rt.state);

    for (const s of this.survivorSlots) {
      const fx = this.hitFeel.getUnitOffset(s.id);
      const pose = this.stripPosePhase(snap);
      const sv = this.rt.state.survivors[Number(s.id.split("-")[1])];
      const locPose = pose === "attack" ? "attack" : pose === "hurt" ? "hurt" : "idle";
      const loco = stripLocomotionOffset(snap, Number(s.id.split("-")[1]), locPose);
      const lunge = sv ? stripMeleeLungeDx(sv.role, pose === "attack") : 0;
      const x = s.baseX + fx.dx + loco.dx + lunge;
      const y = s.baseAnchorY + loco.dy;
      if (!fx.frozen) {
        s.sprite.setPosition(x, y);
        s.sprite.setScale(s.scale * loco.scaleX, s.scale * loco.scaleY);
        const feetY = y - 8 * s.scale;
        s.hpBack.setPosition(x, feetY - 18);
        s.hpFill.setPosition(x - 13, feetY - 18);
        s.shadow.setPosition(x, STRIP_GROUND_Y + 1);
      }
      this.hitFeel.applySpriteTint(s.sprite, s.id, 0xffffff);
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
      if (!fx.frozen) {
        z.sprite.setPosition(x, y);
        z.sprite.setScale(z.scale * loco.scaleX, z.scale * loco.scaleY);
        z.shadow.setPosition(x, STRIP_GROUND_Y + 1);
      }
      const tint = z.boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
      this.hitFeel.applySpriteTint(z.sprite, z.id, tint);
    }

    if (this.companionSprite && this.companionShadow) {
      const cx = 22 + this.rt.state.survivors.length * 24 + 16;
      const cScale = 0.26;
      const cy = stripUnitAnchorY(cScale);
      this.companionSprite.setPosition(cx, cy);
      this.companionShadow.setPosition(cx, STRIP_GROUND_Y + 1);
    }
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
      const frontZ = this.zombieSlots[0];
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
    backgroundColor: "#121820",
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
