import Phaser from 'phaser';
import { SaveSlot } from '../../components/ui/SaveSlot';
import type { SaveData } from '../../lib/database';
import { SaveDataManager } from '../../lib/cache/SaveDataManager';

/**
 * セーブスロット選択画面のオーバーレイシーン
 * 複数のセーブスロットを表示し、選択・削除を行う
 */
export class SaveSlotsOverlay extends Phaser.Scene {
  private saveManager!: SaveDataManager;
  private slots: SaveSlot[] = [];
  private parentSceneKey: string = '';

  // スロット設定
  private readonly SLOT_WIDTH = 400;
  private readonly SLOT_HEIGHT = 80;
  private readonly SLOT_PADDING = 20;

  constructor() {
    super({ key: 'SaveSlotsOverlay' });
  }

  /**
   * 初期化時に親シーンのキーを受け取る
   */
  init(data: { parentSceneKey?: string }) {
    this.parentSceneKey = data.parentSceneKey || 'Game';
    this.saveManager = SaveDataManager.getInstance();
  }

  async create(): Promise<void> {
    // 半透明の背景オーバーレイ
    this.createOverlayBackground();

    // セーブデータ読み込み（Manager経由）
    await this.loadSaves();

    // UIを構築
    this.createUI();

    // 入力設定
    this.setupInput();
  }

  /**
   * 半透明の背景を作成
   */
  private createOverlayBackground(): void {
    const { width, height } = this.scale;
    const maxSlots = this.saveManager.getMaxSlots();

    // 暗い半透明背景（クリック貫通を防止）
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setInteractive();

    // ダイアログ背景
    const dialogWidth = this.SLOT_WIDTH + 80;
    const dialogHeight = (this.SLOT_HEIGHT + this.SLOT_PADDING) * maxSlots + 120;
    const dialogX = (width - dialogWidth) / 2;
    const dialogY = (height - dialogHeight) / 2;

    this.add.rectangle(dialogX, dialogY, dialogWidth, dialogHeight, 0x222222)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x444444);
  }

  /**
   * セーブデータをManager経由で読み込み
   */
  private async loadSaves(): Promise<void> {
    try {
      await this.saveManager.load();
      console.log('SaveSlotsOverlay: Loaded saves via Manager');
    } catch (err) {
      console.error('SaveSlotsOverlay: Failed to load saves:', err);
    }
  }

  /**
   * UI要素を構築
   */
  private createUI(): void {
    const { width, height } = this.scale;

    // タイトル
    this.add.text(width / 2, height / 2 - 180, 'セーブデータ選択', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Roboto',
    }).setOrigin(0.5);

    // スロットを配置
    this.createSlots();

    // 閉じるボタン
    this.createCloseButton();
  }

  /**
   * セーブスロットを作成
   */
  private createSlots(): void {
    const { width, height } = this.scale;
    const startX = (width - this.SLOT_WIDTH) / 2;
    const startY = height / 2 - 100;
    const maxSlots = this.saveManager.getMaxSlots();

    // 既存スロットをクリア
    this.slots.forEach(slot => slot.destroy());
    this.slots = [];

    // Manager経由でスロットデータを取得
    const slotData = this.saveManager.getSlots();

    // MAX_SLOTS分のスロットを作成
    for (let i = 0; i < maxSlots; i++) {
      const saveData = slotData[i] || null;
      const y = startY + i * (this.SLOT_HEIGHT + this.SLOT_PADDING);

      const slot = new SaveSlot(this, {
        x: startX,
        y: y,
        width: this.SLOT_WIDTH,
        height: this.SLOT_HEIGHT,
        save: saveData,
        slotIndex: i,
        onSelect: (save: SaveData | null, index: number) => this.onSlotSelect(save, index),
        onDelete: (save: SaveData) => this.onSlotDelete(save),
      });

      this.slots.push(slot);
    }
  }

  /**
   * 閉じるボタンを作成
   */
  private createCloseButton(): void {
    const { width, height } = this.scale;

    const closeBtn = this.add.text(width / 2, height / 2 + 150, '閉じる (ESC)', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'Roboto',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setColor('#ffffff'))
      .on('pointerout', () => closeBtn.setColor('#aaaaaa'))
      .on('pointerdown', () => this.closeOverlay());
  }

  /**
   * 入力設定
   */
  private setupInput(): void {
    // ESCキーで閉じる
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => this.closeOverlay());
  }

  /**
   * スロット選択時のコールバック
   */
  private onSlotSelect(save: SaveData | null, slotIndex: number): void {
    console.log('Selected slot:', slotIndex, save);

    // Manager経由でスロットを選択（ゲームデータをロード）
    const gameData = this.saveManager.selectSlot(slotIndex);
    console.log('Loaded game data:', gameData);

    // 親シーンにイベントを送信
    const parentScene = this.scene.get(this.parentSceneKey);
    if (parentScene) {
      parentScene.events.emit('saveSlotSelected', { save, slotIndex, gameData });
    }

    // オーバーレイを閉じる
    this.closeOverlay();
  }

  /**
   * スロット削除時のコールバック
   */
  private async onSlotDelete(save: SaveData): Promise<void> {
    console.log('Delete requested for save:', save.id);

    // 削除するスロットのインデックスを特定
    const slotData = this.saveManager.getSlots();
    const slotIndex = slotData.findIndex(s => s?.id === save.id);

    if (slotIndex !== -1) {
      // Manager経由で削除
      await this.saveManager.deleteSlot(slotIndex);

      // スロットを再描画
      this.createSlots();
    }
  }

  /**
   * オーバーレイを閉じる
   */
  private closeOverlay(): void {
    this.scene.stop();
  }
}
