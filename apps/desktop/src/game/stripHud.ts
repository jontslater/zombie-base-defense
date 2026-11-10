import Phaser from "phaser";
import type { GameState } from "@zbd/sim";
import type { StripCombatSnapshot } from "@zbd/sim";

export class StripHud {
  private chipCoin!: Phaser.GameObjects.Container;
  private chipWave!: Phaser.GameObjects.Container;
  private coreFill!: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene) {}

  create() {
    this.chipCoin = this.scene.add.container(6, 4).setDepth(30);
    const coinBg = this.scene.add.rectangle(0, 0, 52, 14, 0x1a2218, 0.82).setOrigin(0, 0);
    coinBg.setStrokeStyle(1, 0x4a5d3a, 0.9);
    const coinIcon = this.scene.add.image(8, 7, "sprites", "gem_green").setScale(0.11);
    const coinText = this.scene.add
      .text(16, 2, "0", { fontSize: "10px", color: "#ffe28a", fontStyle: "bold" })
      .setOrigin(0, 0);
    coinText.name = "coin";
    this.chipCoin.add([coinBg, coinIcon, coinText]);

    this.chipWave = this.scene.add.container(58, 4).setDepth(30);
    const waveBg = this.scene.add.rectangle(0, 0, 36, 14, 0x1a2218, 0.82).setOrigin(0, 0);
    waveBg.setStrokeStyle(1, 0x4a5d3a, 0.9);
    const waveText = this.scene.add
      .text(6, 2, "W1", { fontSize: "10px", color: "#d8f0c8", fontStyle: "bold" })
      .setOrigin(0, 0);
    waveText.name = "wave";
    this.chipWave.add([waveBg, waveText]);

    this.scene.add.rectangle(0, 77, 400, 3, 0x2a1820).setOrigin(0, 0.5).setDepth(30);
    this.coreFill = this.scene.add
      .rectangle(0, 77, 400, 2, 0xe85d6a)
      .setOrigin(0, 0.5)
      .setDepth(31);
  }

  update(state: GameState, snap: StripCombatSnapshot | null) {
    const coin = this.chipCoin.getByName("coin") as Phaser.GameObjects.Text;
    coin.setText(this.formatCoin(state.currency));
    const wave = this.chipWave.getByName("wave") as Phaser.GameObjects.Text;
    const boss = snap?.isBoss ? " ★" : "";
    wave.setText(`W${state.wave}${boss}`);
    const ratio = Math.max(0, state.baseCoreHp / Math.max(1, state.baseCoreMaxHp));
    this.coreFill.width = 400 * ratio;
    this.coreFill.fillColor = ratio > 0.35 ? 0x5cd65c : 0xe85d6a;
  }

  private formatCoin(n: number): string {
    if (n >= 10000) return `${Math.floor(n / 1000)}k`;
    return String(Math.floor(n));
  }
}
