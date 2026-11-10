import Phaser from "phaser";
import {
  companionDef,
  computeStripCombatSnapshot,
  captureStripCombatFxPrev,
  deriveStripCombatFxEvents,
  perimeterUnlockedCount,
  stripCampaignTag,
  stripSurvivorSpriteKey,
  stripZombieKindAtSlot,
  stripZombieSpriteKey,
  type StripCombatFxPrev,
  type StripCombatSnapshot,
  type StripSurvivorFramePhase,
} from "@zbd/sim";
import type { GameRuntime } from "./runtime";
import { StripHitFeel } from "./stripHitFeel";

const SURVIVOR_SCALE = 0.52;
const ZOMBIE_SCALE = 0.52;
const STRUCTURE_SCALE = 0.42;
const ZOMBIE_TINT = 0x6ecf5a;
const ZOMBIE_BOSS_TINT = 0xc084fc;
const ZOMBIE_BOSS_SCALE = 0.62;
const CORE_HP_BAR_Y = 62;

type ZombieSlot = {
  id: string;
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  boss: boolean;
};

type SurvivorSlot = {
  id: string;
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  baseY: number;
  hpBack: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
};

export class StripScene extends Phaser.Scene {
  private rt!: GameRuntime;
  private barHp!: Phaser.GameObjects.Rectangle;
  private label!: Phaser.GameObjects.Text;
  private survivorSlots: SurvivorSlot[] = [];
  private companionSprite: Phaser.GameObjects.Image | null = null;
  private zombieSlots: ZombieSlot[] = [];
  private wallSprites: Phaser.GameObjects.Image[] = [];
  private turretSprites: Phaser.GameObjects.Image[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private lastHitAt = 0;

  private fxPrev: StripCombatFxPrev | null = null;
  private layoutSig = "";
  private floatLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;
  private hitFeel!: StripHitFeel;

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
    for (const s of this.survivorSlots) {
      s.sprite.destroy();
      s.hpBack.destroy();
      s.hpFill.destroy();
    }
    for (const z of this.zombieSlots) z.sprite.destroy();
    if (this.companionSprite) {
      this.companionSprite.destroy();
      this.companionSprite = null;
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
      const x = 22 + i * 22;
      const swayBase = snap?.swayRad ?? 0;
      const y = 42 + Math.sin(swayBase + i * 0.7) * 1.2;
      const key = stripSurvivorSpriteKey(sv.role, i, pose);
      const spr = this.add.image(x, y, "sprites", key).setScale(SURVIVOR_SCALE);
      spr.setFlipX(false);
      spr.setDepth(3);
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
      this.survivorSlots.push({
        id: `sv-${i}`,
        sprite: spr,
        baseX: x,
        baseY: y,
        hpBack,
        hpFill,
      });
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
    const zPose = this.stripZombiePosePhase(snap);

    for (let i = 0; i < nVisible; i++) {
      const u = nVisible <= 1 ? 0.82 : i / Math.max(1, nVisible - 1);
      const xBase = zxMin + u * spread;
      const march =
        Math.sin((snap.march01 + u * 0.37 + i * 0.09) * Math.PI * 2) * (snap.isBoss ? 2 : 4);
      const x = Phaser.Math.Clamp(xBase + march, zxMin, baseX - 12);
      const y = 42 + Math.sin(snap.swayRad * 0.8 + i * 1.1) * (snap.isBoss ? 1.5 : 2.5);
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      const zKey = stripZombieSpriteKey(kind, zPose);
      const spr = this.add
        .image(x, y, "sprites", zKey)
        .setScale(snap.isBoss ? ZOMBIE_BOSS_SCALE : ZOMBIE_SCALE);
      spr.setFlipX(true);
      const boss = snap.isBoss && i === 0;
      const tint = boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
      spr.setTint(tint);
      spr.setDepth(boss ? 4 : 3);
      if (snap.isBoss && i === 0) spr.setAlpha(0.98);
      this.zombieSlots.push({
        id: `z-${i}`,
        sprite: spr,
        baseX: x,
        baseY: y,
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
      const swayBase = snap?.swayRad ?? 0;
      slot.baseX = 22 + i * 22;
      slot.baseY = 42 + Math.sin(swayBase + i * 0.7) * 1.2;
      const hpW = 26;
      const ratio = Math.max(0, Math.min(1, sv.hp / Math.max(1, sv.maxHp)));
      slot.hpFill.width = hpW * ratio;
      slot.hpFill.fillColor = ratio > 0.35 ? 0x3d8bfd : 0xe74c3c;
    });

    if (!snap) return;
    const zPose = this.stripZombiePosePhase(snap);
    const zxMin = 120;
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
        Math.sin((snap.march01 + u * 0.37 + i * 0.09) * Math.PI * 2) * (snap.isBoss ? 2 : 4);
      slot.baseX = Phaser.Math.Clamp(xBase + march, zxMin, baseX - 12);
      slot.baseY = 42 + Math.sin(snap.swayRad * 0.8 + i * 1.1) * (snap.isBoss ? 1.5 : 2.5);
      const kind = stripZombieKindAtSlot(snap, i, nVisible);
      slot.sprite.setTexture("sprites", stripZombieSpriteKey(kind, zPose));
    });
  }

  private applyUnitFxOffsets() {
    for (const s of this.survivorSlots) {
      const fx = this.hitFeel.getUnitOffset(s.id);
      if (!fx.frozen) {
        s.sprite.setPosition(s.baseX + fx.dx, s.baseY + fx.dy);
        s.hpBack.setPosition(s.baseX + fx.dx, s.baseY + fx.dy - 22);
        s.hpFill.setPosition(s.baseX + fx.dx - 13, s.baseY + fx.dy - 22);
      }
      this.hitFeel.applySpriteTint(s.sprite, s.id, 0xffffff);
    }
    for (const z of this.zombieSlots) {
      const fx = this.hitFeel.getUnitOffset(z.id);
      if (!fx.frozen) {
        z.sprite.setPosition(z.baseX + fx.dx, z.baseY + fx.dy);
      }
      const tint = z.boss ? ZOMBIE_BOSS_TINT : ZOMBIE_TINT;
      this.hitFeel.applySpriteTint(z.sprite, z.id, tint);
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
                y: frontZ.baseY,
                sprite: frontZ.sprite,
                boss: frontZ.boss,
              }
            : undefined,
          survivor: survSlot
            ? { id: survSlot.id, x: survSlot.baseX, y: survSlot.baseY, sprite: survSlot.sprite }
            : undefined,
          attacker: atkSlot
            ? { id: atkSlot.id, x: atkSlot.baseX, y: atkSlot.baseY, sprite: atkSlot.sprite }
            : undefined,
        });
      }

      if (prev.zombiesRemaining > (snap.zombiesRemaining ?? 0)) {
        const killed = prev.zombiesRemaining - snap.zombiesRemaining;
        const target = this.zombieSlots[this.zombieSlots.length - 1] ?? this.zombieSlots[0];
        if (target) {
          const killPts = 2 + Math.floor(state.wave * 0.5);
          this.spawnCurrencyFloat(target.baseX, target.baseY - 8, killPts * killed);
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
