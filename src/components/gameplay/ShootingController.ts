import Phaser from 'phaser';
import { BulletPool, BulletPoolConfig } from './BulletPool';
import { PlayerStatsGameplayComponent } from './PlayerStatsGameplayComponent';

/**
 * 射撃コントローラーの設定
 */
export interface ShootingControllerConfig {
  /** 連射間隔（ミリ秒、デフォルト: 100） */
  fireRate?: number;
  /** 弾プールの設定 */
  bulletPoolConfig?: BulletPoolConfig;
  /** プレイヤーステータス（MP消費に使用、オプション） */
  playerStats?: PlayerStatsGameplayComponent;
}

/**
 * 射撃コントローラー
 * マウス方向への弾の連射を管理
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.shootingController = new ShootingController(this, player, { fireRate: 100 });
 * 
 * // update()で更新
 * this.shootingController.update(time, delta);
 * 
 * // 破棄時
 * this.shootingController.destroy();
 * ```
 */
export class ShootingController {
  private scene: Phaser.Scene;
  private shooter: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  private bulletPool: BulletPool;
  private playerStats?: PlayerStatsGameplayComponent;

  // 射撃設定
  private fireRate: number;
  private lastFireTime: number = 0;

  // 有効フラグ
  private enabled: boolean = true;

  /**
   * @param scene 所属するシーン
   * @param shooter 射撃元のGameObject（位置を持つこと）
   * @param config 設定オプション
   */
  constructor(
    scene: Phaser.Scene,
    shooter: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform,
    config: ShootingControllerConfig = {}
  ) {
    this.scene = scene;
    this.shooter = shooter;
    this.fireRate = config.fireRate ?? 100;
    this.playerStats = config.playerStats;

    // 弾プールを作成
    this.bulletPool = new BulletPool(scene, config.bulletPoolConfig);
  }

  /**
   * 更新処理
   * マウスボタンが押されていれば連射
   * @param time 現在時間
   * @param delta デルタタイム
   */
  update(time: number, delta: number): void {
    if (!this.enabled) return;

    // 弾の更新
    this.bulletPool.updateBullets(time, delta);

    // マウス左ボタンが押されているか
    if (this.scene.input.activePointer.isDown) {
      this.tryFire(time);
    }
  }

  /**
   * 射撃を試行
   * @param time 現在時間
   */
  private tryFire(time: number): void {
    // 連射間隔チェック
    if (time - this.lastFireTime < this.fireRate) {
      return;
    }

    // MP消費チェック（PlayerStatsが設定されている場合）
    if (this.playerStats) {
      if (!this.playerStats.canShoot()) {
        return; // MP不足で発射不可
      }
      this.playerStats.consumeMpForShot();
    }

    const pointer = this.scene.input.activePointer;

    // 弾を発射
    this.bulletPool.fire(
      this.shooter.x,
      this.shooter.y,
      pointer.worldX,
      pointer.worldY
    );

    this.lastFireTime = time;
  }

  /**
   * 手動で射撃
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   */
  fireAt(targetX: number, targetY: number): void {
    this.bulletPool.fire(this.shooter.x, this.shooter.y, targetX, targetY);
  }

  /**
   * 弾プールを取得
   */
  getBulletPool(): BulletPool {
    return this.bulletPool;
  }

  /**
   * 有効/無効を設定
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 有効かどうかを取得
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 連射間隔を設定
   */
  setFireRate(fireRate: number): void {
    this.fireRate = fireRate;
  }

  /**
   * 全ての弾を非アクティブ化
   */
  clearBullets(): void {
    this.bulletPool.deactivateAll();
  }

  /**
   * コントローラーを破棄
   */
  destroy(): void {
    this.bulletPool.destroy(true);
  }
}
