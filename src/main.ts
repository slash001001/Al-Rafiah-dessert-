import Phaser from "phaser";

class SmokeScene extends Phaser.Scene {
  constructor() {
    super("SmokeScene");
  }
  create() {
    const { width, height } = this.scale;

    // Background
    this.cameras.main.setBackgroundColor(0x0b0f14);

    // Title
    this.add
      .text(width / 2, height / 2 - 20, "الرافعية — تشغيل تجريبي", {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, "Phaser bundled ✅ | Vite ✅ | GH Pages base ✅", {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontSize: "16px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0b0f14",
  scene: [SmokeScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
