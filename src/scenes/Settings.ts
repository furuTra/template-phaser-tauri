import Phaser from 'phaser';
import {
  setWindowSize,
  setFullscreen,
  loadWindowSettings,
  WindowSettings
} from '@/lib/windowSettings';
import { Button } from '@/components/ui/Button';

export class Settings extends Phaser.Scene {
  private currentSettings!: WindowSettings;
  private fullscreenButton!: Button;

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

      // 解像度ボタン
      new Button(this, {
        x: 150,
        y: y,
        text: res.label,
        color: isSelected ? '#00ff00' : '#ffffff',
        backgroundColor: '#333333',
        hoverColor: '#777777',
        padding: { x: 10, y: 5 },
        onClick: () => this.selectResolution(res.width, res.height),
      });
    });

    // フルスクリーン切り替え
    const fullscreenY = 160 + this.resolutions.length * 40 + 30;
    this.fullscreenButton = new Button(this, {
      x: 150,
      y: fullscreenY,
      text: this.getFullscreenText(),
      backgroundColor: '#333333',
      hoverColor: '#777777',
      padding: { x: 10, y: 5 },
      onClick: () => this.toggleFullscreen(),
    });

    // 戻るボタン
    new Button(this, {
      x: 150,
      y: fullscreenY + 60,
      text: '← Back to Game',
      backgroundColor: '#333333',
      hoverColor: '#777777',
      padding: { x: 10, y: 5 },
      onClick: () => this.scene.start('Game'),
    });
  }

  async selectResolution(width: number, height: number) {
    this.currentSettings.width = width;
    this.currentSettings.height = height;
    this.currentSettings.fullscreen = false;

    await setWindowSize(width, height);

    // シーンを再描画
    this.scene.restart();
  }

  private async toggleFullscreen() {
    this.currentSettings.fullscreen = !this.currentSettings.fullscreen;

    await setFullscreen(this.currentSettings.fullscreen);

    this.fullscreenButton.setText(this.getFullscreenText());
  }

  private getFullscreenText(): string {
    return `Fullscreen: ${this.currentSettings.fullscreen ? 'ON' : 'OFF'}`;
  }
}
