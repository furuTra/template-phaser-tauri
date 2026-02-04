import Phaser from 'phaser';

/**
 * Bulletで使用可能なGameObject型
 */
export type BulletGameObject = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  setPosition(x: number, y: number): unknown;
  setRotation(radians: number): unknown;
  setActive(value: boolean): unknown;
  setVisible(value: boolean): unknown;
};

/**
 * 弾の設定
 */
export interface BulletConfig {
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
  speed: 500,
  lifespan: 2000,
  damage: 10,
};

/**
 * 弾オブジェクト
 * 外部から渡されたGameObjectに物理ボディを付与して管理
 */
export class Bullet {
  readonly scene: Phaser.Scene;
  readonly gameObject: BulletGameObject;

  private speed: number;
  private lifespan: number;
  private damage: number;
  private spawnTime: number = 0;

  /**
   * @param scene シーン
   * @param gameObject 弾として使用するGameObject（Rectangle, Arc, Sprite等）
   * @param config 弾の設定
   */
  constructor(scene: Phaser.Scene, gameObject: BulletGameObject, config: BulletConfig = {}) {
    this.scene = scene;
    this.gameObject = gameObject;

    this.speed = config.speed ?? DEFAULT_BULLET_CONFIG.speed;
    this.lifespan = config.lifespan ?? DEFAULT_BULLET_CONFIG.lifespan;
    this.damage = config.damage ?? DEFAULT_BULLET_CONFIG.damage;

    // 物理ボディを追加
    scene.physics.add.existing(gameObject);
    const body = this.body;
    body.setAllowGravity(false);
  }

  /**
   * 物理ボディを取得
   */
  get body(): Phaser.Physics.Arcade.Body {
    return this.gameObject.body as Phaser.Physics.Arcade.Body;
  }

  /**
   * X座標を取得
   */
  get x(): number {
    return this.gameObject.x;
  }

  /**
   * X座標を設定
   */
  set x(value: number) {
    this.gameObject.x = value;
  }

  /**
   * Y座標を取得
   */
  get y(): number {
    return this.gameObject.y;
  }

  /**
   * Y座標を設定
   */
  set y(value: number) {
    this.gameObject.y = value;
  }

  /**
   * アクティブ状態を取得
   */
  get active(): boolean {
    return this.gameObject.active;
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
   * 位置を設定
   */
  setPosition(x: number, y: number): this {
    this.gameObject.setPosition(x, y);
    return this;
  }

  /**
   * 回転を設定
   */
  setRotation(radians: number): this {
    this.gameObject.setRotation(radians);
    return this;
  }

  /**
   * アクティブ状態を設定
   */
  setActive(value: boolean): this {
    this.gameObject.setActive(value);
    return this;
  }

  /**
   * 表示状態を設定
   */
  setVisible(value: boolean): this {
    this.gameObject.setVisible(value);
    return this;
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

    // 弾の向きを設定
    this.setRotation(angle);

    // 物理ボディの速度を設定
    this.body.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );

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

    this.setRotation(angle);

    // 物理ボディの速度を設定
    this.body.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );

    this.spawnTime = this.scene.time.now;
  }

  /**
   * 弾を非アクティブ化
   */
  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.setPosition(-100, -100);

    // 物理ボディの速度をリセット
    this.body.setVelocity(0, 0);
  }

  /**
   * 弾の設定を適用
   * 武器から動的に設定を変更する場合に使用
   * @param config 弾の設定
   */
  applyConfig(config: BulletConfig): void {
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
   * @param _delta デルタタイム（ミリ秒）
   */
  update(_time: number, _delta: number): void {
    if (!this.active) return;

    // 位置は物理エンジンが自動更新するため、手動更新は不要

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

  /**
   * 破棄
   */
  destroy(): void {
    this.gameObject.destroy();
  }
}
