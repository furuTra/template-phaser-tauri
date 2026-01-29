import Phaser from 'phaser';
import { Button } from '@/components/ui/Button';

/**
 * 発射モードの定義
 */
export interface ShootingMode {
  /** モードID */
  id: string;
  /** 表示名 */
  name: string;
  /** 説明 */
  description: string;
  /** MP消費量 */
  mpCost: number;
  /** 発射レート（ミリ秒） */
  fireRate: number;
}

/**
 * 発射モード選択モーダルの設定
 */
export interface WeaponSelectModalConfig {
  /** 利用可能な発射モード */
  modes: ShootingMode[];
  /** 選択時のコールバック */
  onSelect?: (mode: ShootingMode) => void;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
}

/**
 * 発射モード選択モーダルUIコンポーネント
 * Zキーで表示され、発射モードを選択できるモーダル
 * 
 * 使用例:
 * ```typescript
 * const modal = new WeaponSelectModalUIComponent(this, {
 *   modes: [
 *     { id: 'single', name: '単発', description: '通常の射撃', mpCost: 15, fireRate: 100 },
 *     { id: 'triple', name: '3方向', description: '3方向に同時発射', mpCost: 30, fireRate: 300 },
 *   ],
 *   onSelect: (mode) => { this.setShootingMode(mode); },
 *   onCancel: () => { console.log('キャンセル'); },
 * });
 * 
 * modal.show();
 * modal.hide();
 * ```
 */
export class WeaponSelectModalUIComponent extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  private buttons: Button[] = [];
  private config: WeaponSelectModalConfig;
  private selectedIndex: number = 0;
  private isVisible: boolean = false;

  // キー入力
  private keyUp?: Phaser.Input.Keyboard.Key;
  private keyDown?: Phaser.Input.Keyboard.Key;
  private keyEnter?: Phaser.Input.Keyboard.Key;
  private keyEscape?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, config: WeaponSelectModalConfig) {
    super(scene, 0, 0);

    this.config = config;

    const { width, height } = scene.scale;

    // 半透明の背景オーバーレイ
    this.background = scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );
    this.add(this.background);

    // パネル
    const panelWidth = 350;
    const panelHeight = 80 + config.modes.length * 70;
    this.panel = scene.add.rectangle(
      width / 2,
      height / 2,
      panelWidth,
      panelHeight,
      0x222233,
      1
    );
    this.panel.setStrokeStyle(2, 0x4444ff);
    this.add(this.panel);

    // タイトル
    this.titleText = scene.add.text(
      width / 2,
      height / 2 - panelHeight / 2 + 30,
      '発射モード選択',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Roboto',
      }
    ).setOrigin(0.5);
    this.add(this.titleText);

    // モード選択ボタンを作成
    this.createModeButtons(scene, width, height, panelHeight);

    // キー入力を設定
    this.setupKeyInput(scene);

    // シーンに追加
    scene.add.existing(this);

    // 初期状態は非表示
    this.setVisible(false);
    this.setDepth(1000);
  }

  /**
   * モード選択ボタンを作成
   */
  private createModeButtons(
    scene: Phaser.Scene,
    screenWidth: number,
    screenHeight: number,
    panelHeight: number
  ): void {
    const startY = screenHeight / 2 - panelHeight / 2 + 70;

    this.config.modes.forEach((mode, index) => {
      const buttonY = startY + index * 70;

      const button = new Button(scene, {
        x: screenWidth / 2,
        y: buttonY,
        text: `${mode.name} (MP: ${mode.mpCost})`,
        fontSize: '18px',
        backgroundColor: '#333355',
        hoverColor: '#4444aa',
        padding: { x: 40, y: 12 },
        onClick: () => this.selectMode(index),
      });

      // 説明テキスト
      const descText = scene.add.text(
        screenWidth / 2,
        buttonY + 25,
        mode.description,
        {
          fontSize: '12px',
          color: '#aaaaaa',
          fontFamily: 'Roboto',
        }
      ).setOrigin(0.5);

      this.add(descText);
      this.buttons.push(button);
      this.add(button);
    });

    // 初期選択状態を設定
    this.updateButtonSelection();
  }

  /**
   * キー入力を設定
   */
  private setupKeyInput(scene: Phaser.Scene): void {
    this.keyUp = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyEnter = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyEscape = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.keyUp?.on('down', () => {
      if (!this.isVisible) return;
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateButtonSelection();
    });

    this.keyDown?.on('down', () => {
      if (!this.isVisible) return;
      this.selectedIndex = Math.min(this.config.modes.length - 1, this.selectedIndex + 1);
      this.updateButtonSelection();
    });

    this.keyEnter?.on('down', () => {
      if (!this.isVisible) return;
      this.selectMode(this.selectedIndex);
    });

    this.keyEscape?.on('down', () => {
      if (!this.isVisible) return;
      this.cancel();
    });
  }

  /**
   * ボタンの選択状態を更新
   */
  private updateButtonSelection(): void {
    this.buttons.forEach((button, index) => {
      button.setSelected(index === this.selectedIndex);
    });
  }

  /**
   * モードを選択
   */
  private selectMode(index: number): void {
    const mode = this.config.modes[index];
    this.hide();
    this.config.onSelect?.(mode);
  }

  /**
   * キャンセル
   */
  private cancel(): void {
    this.hide();
    this.config.onCancel?.();
  }

  /**
   * モーダルを表示
   */
  show(): void {
    this.isVisible = true;
    this.setVisible(true);
    this.updateButtonSelection();
  }

  /**
   * モーダルを非表示
   */
  hide(): void {
    this.isVisible = false;
    this.setVisible(false);
  }

  /**
   * 表示状態を取得
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 現在選択中のモードを取得
   */
  getCurrentMode(): ShootingMode {
    return this.config.modes[this.selectedIndex];
  }

  /**
   * 選択インデックスを設定
   */
  setSelectedIndex(index: number): void {
    this.selectedIndex = Phaser.Math.Clamp(index, 0, this.config.modes.length - 1);
    this.updateButtonSelection();
  }

  /**
   * 破棄処理
   */
  destroy(fromScene?: boolean): void {
    // キーイベントを解除
    this.keyUp?.removeAllListeners();
    this.keyDown?.removeAllListeners();
    this.keyEnter?.removeAllListeners();
    this.keyEscape?.removeAllListeners();

    super.destroy(fromScene);
  }
}
