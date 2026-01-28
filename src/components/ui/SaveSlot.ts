import Phaser from 'phaser';
import { parseGameData, SaveData } from '@/lib/database';

export interface SaveSlotConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  save: SaveData | null;
  slotIndex: number;
  onSelect?: (save: SaveData | null, index: number) => void;
  onDelete?: (save: SaveData) => void;
}

export class SaveSlot extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private save: SaveData | null;
  private slotIndex: number;

  constructor(scene: Phaser.Scene, config: SaveSlotConfig) {
    super(scene, config.x, config.y);

    this.save = config.save;
    this.slotIndex = config.slotIndex;
    // 背景
    this.background = scene.add.rectangle(0, 0, config.width, config.height, 0x333333)
      .setOrigin(0, 0);
    this.add(this.background);

    if (this.save) {
      const gameData = parseGameData(this.save);

      // タイトル
      const title = scene.add.text(10, 10, this.save.title, {
        fontSize: '18px',
        color: '#ffffff',
      });
      this.add(title);

      // ゲームデータ
      const info = scene.add.text(10, 35,
        `Lv: ${gameData.lv} | Exp: ${gameData.exp}`, {
        fontSize: '14px',
        color: '#aaaaaa',
      });
      this.add(info);

      // 更新日時
      const date = new Date(this.save.updated_at).toLocaleString();
      const dateText = scene.add.text(10, 55, date, {
        fontSize: '12px',
        color: '#666666',
      });
      this.add(dateText);

      // 削除ボタン
      const deleteBtn = scene.add.text(config.width - 30, 10, '✕', {
        fontSize: '16px',
        color: '#ff6666',
      })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (e: Phaser.Input.Pointer) => {
          e.stopPropagation();
          config.onDelete?.(this.save!);
        });
      this.add(deleteBtn);

    } else {
      // 空スロット
      const emptyText = scene.add.text(config.width / 2, config.height / 2, 'Empty Slot', {
        fontSize: '16px',
        color: '#666666',
      }).setOrigin(0.5);
      this.add(emptyText);
    }

    // クリック可能に
    this.setSize(config.width, config.height);
    this.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.background.setFillStyle(0x444444))
      .on('pointerout', () => this.background.setFillStyle(0x333333))
      .on('pointerdown', () => config.onSelect?.(this.save, this.slotIndex));

    scene.add.existing(this);
  }
}
