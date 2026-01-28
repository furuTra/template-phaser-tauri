import Phaser from 'phaser';
import type { RangedWeapon } from '@/types/Weapon';

/**
 * 弾の設定
 */
export interface BulletConfig {
  /** 弾の幅（デフォルト: 16） */
  width?: number;
  /** 弾の高さ（デフォルト: 8） */
  height?: number;
  /** 弾の色（デフォルト: 0xffff00） */
  color?: number;
  /** 弾の速度（デフォルト: 500） */
  speed?: number;
  /** 弾の寿命（ミリ秒、デフォルト: 2000） */
  lifespan?: number;
}

/**
 * 武器から弾の設定を生成
 * @param weapon 遠距離武器
 * @returns 弾の設定
 */
export function createBulletConfigFromWeapon(weapon: RangedWeapon): BulletConfig {
  return {
    width: weapon.bulletWidth,
    height: weapon.bulletHeight,
    color: weapon.bulletColor,
    speed: weapon.velocity.initialSpeed,
    lifespan: (weapon.range / weapon.velocity.initialSpeed) * 1000,
  };
}

/**
 * 弾オブジェクト
 * Phaser.GameObjects.Rectangleを継承
 */
export class Bullet extends Phaser.GameObjects.Rectangle {
  private speed: number = 500;
  private lifespan: number = 2000;
  private spawnTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    const width = config.width ?? 16;
    const height = config.height ?? 8;
    const color = config.color ?? 0xffff00;

    super(scene, x, y, width, height, color);

    this.speed = config.speed ?? 500;
    this.lifespan = config.lifespan ?? 2000;

    // シーンに追加
    scene.add.existing(this);
  }

  /**
   * 弾を発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   */
  fire(fromX: number, fromY: number, targetX: number, targetY: number): void {
    this.setPosition(fromX, fromY);
    this.setActive(true);
    this.setVisible(true);

    // 方向ベクトルを計算
    const angle = Phaser.Math.Angle.Between(fromX, fromY, targetX, targetY);
    this.velocityX = Math.cos(angle) * this.speed;
    this.velocityY = Math.sin(angle) * this.speed;

    // 弾の向きを設定
    this.setRotation(angle);

    // 発射時間を記録
    this.spawnTime = this.scene.time.now;
  }

  /**
   * 弾を非アクティブ化
   */
  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setPosition(-100, -100);
  }

  /**
   * 弾の設定を適用
   * 武器から動的に設定を変更する場合に使用
   * @param config 弾の設定
   */
  applyConfig(config: BulletConfig): void {
    if (config.width !== undefined || config.height !== undefined) {
      this.setSize(config.width ?? this.width, config.height ?? this.height);
    }
    if (config.color !== undefined) {
      this.setFillStyle(config.color);
    }
    if (config.speed !== undefined) {
      this.speed = config.speed;
    }
    if (config.lifespan !== undefined) {
      this.lifespan = config.lifespan;
    }
  }

  /**
   * 更新処理
   * @param delta デルタタイム（ミリ秒）
   */
  update(_time: number, delta: number): void {
    if (!this.active) return;

    // 位置を更新
    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 寿命チェック
    if (this.scene.time.now - this.spawnTime > this.lifespan) {
      this.deactivate();
      return;
    }

    // 画面外チェック
    const { width, height } = this.scene.scale;
    if (this.x < -50 || this.x > width + 50 || this.y < -50 || this.y > height + 50) {
      this.deactivate();
    }
  }
}

/**
 * 弾プールの設定
 */
export interface BulletPoolConfig {
  /** プール内の最大弾数（デフォルト: 50） */
  maxBullets?: number;
  /** 弾の設定 */
  bulletConfig?: BulletConfig;
}

/**
 * 弾のオブジェクトプール
 * パフォーマンス最適化のため、弾を再利用
 */
export class BulletPool extends Phaser.GameObjects.Group {
  private bulletConfig: BulletConfig;

  constructor(scene: Phaser.Scene, config: BulletPoolConfig = {}) {
    super(scene);

    const maxBullets = config.maxBullets ?? 50;
    this.bulletConfig = config.bulletConfig ?? {};

    // 弾を事前生成
    for (let i = 0; i < maxBullets; i++) {
      const bullet = new Bullet(scene, -100, -100, this.bulletConfig);
      bullet.deactivate();
      this.add(bullet);
    }
  }

  /**
   * 弾を発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fire(fromX: number, fromY: number, targetX: number, targetY: number): Bullet | null {
    // 非アクティブな弾を取得
    const bullet = this.getFirstDead(false) as Bullet | null;

    if (bullet) {
      bullet.fire(fromX, fromY, targetX, targetY);
      return bullet;
    }

    return null;
  }

  /**
   * カスタム設定で弾を発射
   * 武器システムから呼び出され、武器固有の弾設定を適用
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param config 弾の設定（武器から生成）
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fireWithConfig(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    config: BulletConfig
  ): Bullet | null {
    // 非アクティブな弾を取得
    const bullet = this.getFirstDead(false) as Bullet | null;

    if (bullet) {
      // 武器設定を弾に適用
      bullet.applyConfig(config);
      bullet.fire(fromX, fromY, targetX, targetY);
      return bullet;
    }

    return null;
  }

  /**
   * 全ての弾を更新
   * @param time 現在時間
   * @param delta デルタタイム
   */
  updateBullets(time: number, delta: number): void {
    this.getChildren().forEach((bullet) => {
      (bullet as Bullet).update(time, delta);
    });
  }

  /**
   * 全ての弾を非アクティブ化
   */
  deactivateAll(): void {
    this.getChildren().forEach((bullet) => {
      (bullet as Bullet).deactivate();
    });
  }
}
