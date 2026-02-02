import Phaser from 'phaser';

/**
 * ターゲットエフェクトの設定
 */
export interface TargetEffectConfig {
  /** ターゲットからのオフセット距離（デフォルト: 0） */
  offset?: number;
  /** エフェクトのサイズ（デフォルト: 16） */
  size?: number;
  /** エフェクトの色（デフォルト: 0xff4444） */
  color?: number;
  /** エフェクトの透明度（デフォルト: 0.8） */
  alpha?: number;
  /** 回転アニメーションを有効にするか（デフォルト: true） */
  enableRotation?: boolean;
  /** 回転速度（ラジアン/秒、デフォルト: 2） */
  rotationSpeed?: number;
  /** パルスアニメーションを有効にするか（デフォルト: true） */
  enablePulse?: boolean;
  /** パルス速度（デフォルト: 3） */
  pulseSpeed?: number;
  /** パルスの最小スケール（デフォルト: 0.8） */
  pulseMinScale?: number;
  /** パルスの最大スケール（デフォルト: 1.2） */
  pulseMaxScale?: number;
  /** 表示するかどうか（デフォルト: true） */
  visible?: boolean;
}

/**
 * マウス方向を示すターゲットエフェクトコンポーネント
 * プレイヤーからマウス方向にターゲットマーカーを表示
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.targetEffect = new TargetEffectGameplayComponent(this, {
 *   offset: 50,
 *   size: 16,
 *   color: 0xff4444,
 * });
 * 
 * // update()で更新
 * this.targetEffect.update(time, delta, playerX, playerY);
 * 
 * // 破棄時
 * this.targetEffect.destroy();
 * ```
 */
export class TargetEffectGameplayComponent extends Phaser.GameObjects.Container {
  private config: Required<TargetEffectConfig>;

  // グラフィック要素
  private crosshair: Phaser.GameObjects.Graphics;
  private innerCircle: Phaser.GameObjects.Graphics;

  // アニメーション状態
  private currentRotation: number = 0;
  private pulsePhase: number = 0;

  constructor(scene: Phaser.Scene, config: TargetEffectConfig = {}) {
    super(scene, 0, 0);

    // デフォルト値をマージ
    this.config = {
      offset: 0,
      size: 16,
      color: 0xff4444,
      alpha: 0.8,
      enableRotation: true,
      rotationSpeed: 2,
      enablePulse: true,
      pulseSpeed: 3,
      pulseMinScale: 0.8,
      pulseMaxScale: 1.2,
      visible: true,
      ...config,
    };

    // クロスヘアを作成
    this.crosshair = scene.add.graphics();
    this.innerCircle = scene.add.graphics();

    this.add([this.crosshair, this.innerCircle]);

    // 初期描画
    this.drawCrosshair();
    this.drawInnerCircle();

    // 透明度を設定
    this.setAlpha(this.config.alpha);

    // 表示設定
    this.setVisible(this.config.visible);

    // シーンに追加
    scene.add.existing(this);

    // depth を高めに設定（UIの下、ゲームオブジェクトの上）
    this.setDepth(100);
  }

  /**
   * クロスヘアを描画
   */
  private drawCrosshair(): void {
    const { size, color } = this.config;
    const g = this.crosshair;

    g.clear();
    g.lineStyle(2, color, 1);

    // 外側の円
    g.strokeCircle(0, 0, size);

    // 十字線（外側）
    const lineLength = size * 1.5;
    const gap = size * 0.3;

    // 上
    g.moveTo(0, -gap);
    g.lineTo(0, -lineLength);

    // 下
    g.moveTo(0, gap);
    g.lineTo(0, lineLength);

    // 左
    g.moveTo(-gap, 0);
    g.lineTo(-lineLength, 0);

    // 右
    g.moveTo(gap, 0);
    g.lineTo(lineLength, 0);

    g.strokePath();
  }

  /**
   * 内側の円を描画
   */
  private drawInnerCircle(): void {
    const { size, color } = this.config;
    const g = this.innerCircle;

    g.clear();
    g.fillStyle(color, 0.3);
    g.fillCircle(0, 0, size * 0.4);
  }

  /**
   * 更新処理
   * マウス位置に追従し、アニメーションを更新
   * @param _time 現在時間（未使用、将来の拡張用）
   * @param delta デルタタイム（ミリ秒）
   * @param originX 基準点X座標（プレイヤー位置など）
   * @param originY 基準点Y座標（プレイヤー位置など）
   */
  update(_time: number, delta: number, originX: number, originY: number): void {
    if (!this.visible) return;

    const pointer = this.scene.input.activePointer;
    const targetX = pointer.worldX;
    const targetY = pointer.worldY;

    // 基準点からマウスへの角度と距離を計算
    const angle = Phaser.Math.Angle.Between(originX, originY, targetX, targetY);
    const distance = Phaser.Math.Distance.Between(originX, originY, targetX, targetY);

    // オフセットを考慮した位置を計算
    const offset = this.config.offset;
    const effectDistance = Math.max(0, distance - offset);

    // エフェクトの位置を更新
    this.x = originX + Math.cos(angle) * (offset + effectDistance);
    this.y = originY + Math.sin(angle) * (offset + effectDistance);

    // 回転アニメーション
    if (this.config.enableRotation) {
      this.currentRotation += this.config.rotationSpeed * (delta / 1000);
      this.crosshair.setRotation(this.currentRotation);
    }

    // パルスアニメーション
    if (this.config.enablePulse) {
      this.pulsePhase += this.config.pulseSpeed * (delta / 1000);
      const pulseScale = Phaser.Math.Linear(
        this.config.pulseMinScale,
        this.config.pulseMaxScale,
        (Math.sin(this.pulsePhase) + 1) / 2
      );
      this.innerCircle.setScale(pulseScale);
    }
  }

  /**
   * ターゲットエフェクトを表示
   */
  show(): void {
    this.setVisible(true);
  }

  /**
   * ターゲットエフェクトを非表示
   */
  hide(): void {
    this.setVisible(false);
  }

  /**
   * エフェクトの色を設定
   * @param color 色（hex値）
   */
  setEffectColor(color: number): void {
    this.config.color = color;
    this.drawCrosshair();
    this.drawInnerCircle();
  }

  /**
   * エフェクトのサイズを設定
   * @param size サイズ
   */
  setEffectSize(size: number): void {
    this.config.size = size;
    this.drawCrosshair();
    this.drawInnerCircle();
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): Readonly<Required<TargetEffectConfig>> {
    return { ...this.config };
  }

  /**
   * 破棄処理
   */
  destroy(fromScene?: boolean): void {
    this.crosshair.destroy();
    this.innerCircle.destroy();
    super.destroy(fromScene);
  }
}
