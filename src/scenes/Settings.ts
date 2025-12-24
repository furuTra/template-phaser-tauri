import Phaser from 'phaser';
import {
  setWindowSize,
  setFullscreen,
  loadWindowSettings,
  WindowSettings
} from '../lib/windowSettings';

export class Settings extends Phaser.Scene {
  private currentSettings!: WindowSettings;

  private readonly resolutions = [
    { label: '1280 x 720', width: 1280, height: 720 },
    { label: '1600 x 900', width: 1600, height: 900 },
    { label: '1920 x 1080', width: 1920, height: 1080 },
  ];

  constructor() {
    super({ key: 'Settings' });
  }

  async create() {
    this.currentSettings = await loadWindowSettings();

    this.add.text(100, 50, 'Settings', { fontSize: '32px', color: '#ffffff' });

    // 解像度選択
    this.add.text(100, 120, 'Resolution:', { fontSize: '24px', color: '#ffffff' });

    this.resolutions.forEach((res, index) => {
      const y = 160 + index * 40;
      const isSelected =
        this.currentSettings.width === res.width &&
        this.currentSettings.height === res.height;

      const button = this.add.text(120, y, res.label, {
        fontSize: '20px',
        color: isSelected ? '#00ff00' : '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 10, y: 5 },
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectResolution(res.width, res.height));
    });

    // フルスクリーン切り替え
    const fullscreenY = 160 + this.resolutions.length * 40 + 30;
    const fullscreenButton = this.add.text(100, fullscreenY,
      `Fullscreen: ${this.currentSettings.fullscreen ? 'ON' : 'OFF'}`, {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 },
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleFullscreen(fullscreenButton));

    // 戻るボタン
    this.add.text(100, fullscreenY + 60, '← Back to Game', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#555555',
      padding: { x: 10, y: 5 },
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Game'));
  }

  async selectResolution(width: number, height: number) {
    this.currentSettings.width = width;
    this.currentSettings.height = height;
    this.currentSettings.fullscreen = false;

    await setWindowSize(width, height);

    // シーンを再描画
    this.scene.restart();
  }

  async toggleFullscreen(button: Phaser.GameObjects.Text) {
    this.currentSettings.fullscreen = !this.currentSettings.fullscreen;

    await setFullscreen(this.currentSettings.fullscreen);

    button.setText(`Fullscreen: ${this.currentSettings.fullscreen ? 'ON' : 'OFF'}`);
  }
}