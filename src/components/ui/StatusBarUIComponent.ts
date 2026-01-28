import Phaser from 'phaser';

/**
 * ステータスバーの設定
 */
export interface StatusBarConfig {
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** バーの幅（デフォルト: 200） */
  width?: number;
  /** バーの高さ（デフォルト: 20） */
  height?: number;
  /** バーの色（デフォルト: 0x00ff00） */
  fillColor?: number;
  /** 背景色（デフォルト: 0x333333） */
  backgroundColor?: number;
  /** 枠線の色（デフォルト: 0xffffff） */
  borderColor?: number;
  /** 枠線の太さ（デフォルト: 2） */
  borderWidth?: number;
  /** ラベルテキスト（オプション） */
  label?: string;
  /** ラベルのフォントサイズ（デフォルト: '14px'） */
  labelFontSize?: string;
  /** ラベルの色（デフォルト: '#ffffff'） */
  labelColor?: string;
  /** 初期値（0-1、デフォルト: 1） */
  initialValue?: number;
  /** 数値を表示するか（デフォルト: true） */
  showValue?: boolean;
}

/**
 * ステータスバーUIコンポーネント
 * HP/MPなどの値を視覚的に表示するバー
 * 
 * 使用例:
 * ```typescript
 * // HP バー
 * this.hpBar = new StatusBarUIComponent(this, {
 *   x: 20,
 *   y: 50,
 *   width: 200,
 *   height: 20,
 *   fillColor: 0xff0000,
 *   label: 'HP',
 * });
 * 
 * // 値を更新
 * this.hpBar.setValue(0.75); // 75%
 * this.hpBar.setValueFromNumbers(75, 100); // 75/100
 * ```
 */
export class StatusBarUIComponent extends Phaser.GameObjects.Container {
  private config: Required<StatusBarConfig>;

  // グラフィック要素
  private background: Phaser.GameObjects.Rectangle;
  private fillBar: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private valueText?: Phaser.GameObjects.Text;

  // 状態
  private currentValue: number;
  private maxValue: number = 100;

  constructor(scene: Phaser.Scene, config: StatusBarConfig) {
    super(scene, config.x, config.y);

    // デフォルト値をマージ
    this.config = {
      width: 200,
      height: 20,
      fillColor: 0x00ff00,
      backgroundColor: 0x333333,
      borderColor: 0xffffff,
      borderWidth: 2,
      labelFontSize: '14px',
      labelColor: '#ffffff',
      initialValue: 1,
      showValue: true,
      label: '',
      ...config,
    };

    this.currentValue = this.config.initialValue;

    // 背景を作成
    this.background = scene.add.rectangle(
      this.config.width / 2,
      this.config.height / 2,
      this.config.width,
      this.config.height,
      this.config.backgroundColor
    );

    // 塗りつぶしバーを作成（左寄せ）
    this.fillBar = scene.add.rectangle(
      0,
      this.config.height / 2,
      this.config.width * this.currentValue,
      this.config.height - 4,
      this.config.fillColor
    );
    this.fillBar.setOrigin(0, 0.5);
    this.fillBar.x = 2; // 少し内側に配置

    // 枠線を作成
    this.border = scene.add.graphics();
    this.drawBorder();

    // コンテナに追加
    this.add([this.background, this.fillBar, this.border]);

    // ラベルを作成
    if (this.config.label) {
      this.labelText = scene.add.text(-5, this.config.height / 2, this.config.label, {
        fontSize: this.config.labelFontSize,
        color: this.config.labelColor,
        fontFamily: 'Roboto',
      });
      this.labelText.setOrigin(1, 0.5);
      this.add(this.labelText);
    }

    // 数値表示を作成
    if (this.config.showValue) {
      this.valueText = scene.add.text(
        this.config.width / 2,
        this.config.height / 2,
        '',
        {
          fontSize: '12px',
          color: '#ffffff',
          fontFamily: 'Roboto',
          fontStyle: 'bold',
        }
      );
      this.valueText.setOrigin(0.5);
      this.add(this.valueText);
    }

    // シーンに追加
    scene.add.existing(this);
  }

  /**
   * 枠線を描画
   */
  private drawBorder(): void {
    this.border.clear();
    this.border.lineStyle(this.config.borderWidth, this.config.borderColor, 1);
    this.border.strokeRect(0, 0, this.config.width, this.config.height);
  }

  /**
   * 値を設定（0-1の割合）
   * @param value 0-1の値
   */
  setValue(value: number): this {
    this.currentValue = Phaser.Math.Clamp(value, 0, 1);
    this.updateBar();
    return this;
  }

  /**
   * 数値から値を設定
   * @param current 現在値
   * @param max 最大値
   */
  setValueFromNumbers(current: number, max: number): this {
    this.maxValue = max;
    this.currentValue = max > 0 ? current / max : 0;
    this.updateBar();
    this.updateValueText(current, max);
    return this;
  }

  /**
   * 最大値を取得
   */
  getMaxValue(): number {
    return this.maxValue;
  }

  /**
   * バーの表示を更新
   */
  private updateBar(): void {
    // アニメーション付きで更新
    this.scene.tweens.add({
      targets: this.fillBar,
      width: (this.config.width - 4) * this.currentValue,
      duration: 100,
      ease: 'Power2',
    });
  }

  /**
   * 数値表示を更新
   */
  private updateValueText(current: number, max: number): void {
    if (this.valueText) {
      this.valueText.setText(`${Math.floor(current)}/${max}`);
    }
  }

  /**
   * バーの色を変更
   * @param color 新しい色
   */
  setFillColor(color: number): this {
    this.fillBar.setFillStyle(color);
    return this;
  }

  /**
   * 現在の値（0-1）を取得
   */
  getValue(): number {
    return this.currentValue;
  }

  /**
   * ラベルを変更
   */
  setLabel(label: string): this {
    if (this.labelText) {
      this.labelText.setText(label);
    }
    return this;
  }

  /**
   * 可視性を設定
   */
  setBarVisible(visible: boolean): this {
    this.setVisible(visible);
    return this;
  }

  /**
   * 破棄
   */
  destroy(fromScene?: boolean): void {
    this.border.destroy();
    super.destroy(fromScene);
  }
}

// 後方互換性のためのエイリアス
export { StatusBarUIComponent as StatusBar };
