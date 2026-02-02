import Phaser from 'phaser';

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
  /** 弾のダメージ量（デフォルト: 10） */
  damage?: number;
}

/**
 * デフォルトの弾設定
 */
export const DEFAULT_BULLET_CONFIG: Required<BulletConfig> = {
  width: 16,
  height: 8,
  color: 0xffff00,
  speed: 500,
  lifespan: 2000,
  damage: 10,
};

/**
 * 弾オブジェクト
 * Phaser.GameObjects.Rectangleを継承
 */
export class Bullet extends Phaser.GameObjects.Rectangle {
  private speed: number;
  private lifespan: number;
  private damage: number;
  private spawnTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    const width = config.width ?? DEFAULT_BULLET_CONFIG.width;
    const height = config.height ?? DEFAULT_BULLET_CONFIG.height;
    const color = config.color ?? DEFAULT_BULLET_CONFIG.color;

    super(scene, x, y, width, height, color);

    this.speed = config.speed ?? DEFAULT_BULLET_CONFIG.speed;
    this.lifespan = config.lifespan ?? DEFAULT_BULLET_CONFIG.lifespan;
    this.damage = config.damage ?? DEFAULT_BULLET_CONFIG.damage;

    // シーンに追加
    scene.add.existing(this);

    // 物理ボディを有効化
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
  }

  /**
   * 速度を取得
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * 速度を設定
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * 寿命を取得
   */
  getLifespan(): number {
    return this.lifespan;
  }

  /**
   * 寿命を設定
   */
  setLifespan(lifespan: number): void {
    this.lifespan = lifespan;
  }

  /**
   * ダメージ量を取得
   */
  getDamage(): number {
    return this.damage;
  }

  /**
   * ダメージ量を設定
   */
  setDamage(damage: number): void {
    this.damage = damage;
  }

  /**
   * 弾を発射（基本）
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
   * 角度を指定して弾を発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param angle 発射角度（ラジアン）
   */
  fireAtAngle(fromX: number, fromY: number, angle: number): void {
    this.setPosition(fromX, fromY);
    this.setActive(true);
    this.setVisible(true);

    this.velocityX = Math.cos(angle) * this.speed;
    this.velocityY = Math.sin(angle) * this.speed;

    this.setRotation(angle);
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
    if (config.damage !== undefined) {
      this.damage = config.damage;
    }
  }

  /**
   * 更新処理
   * @param _time 現在時間
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
