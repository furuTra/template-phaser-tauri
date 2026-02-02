import Phaser from 'phaser';
import { BulletPool, BulletPoolConfig } from '@/components/gameplay/BulletPool';
import { PlayerStatsGameplayComponent } from '@/components/gameplay/PlayerStatsGameplayComponent';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';
import type { ShootingMode } from '@/components/ui/WeaponSelectModalUIComponent';

/**
 * デフォルトの発射モード定義
 */
export const DEFAULT_SHOOTING_MODES: ShootingMode[] = [
  {
    id: 'single',
    name: '単発',
    description: '通常の射撃',
    mpCost: 15,
    fireRate: 100,
  },
  {
    id: 'triple',
    name: '3方向',
    description: '3方向に同時発射',
    mpCost: 30,
    fireRate: 300,
  },
  {
    id: 'spread',
    name: '拡散',
    description: '5方向に拡散発射',
    mpCost: 50,
    fireRate: 400,
  },
];

/**
 * 射撃コントローラーの設定
 */
export interface ShootingControllerConfig {
  /** 連射間隔（ミリ秒、デフォルト: 100）- 武器未装備時のフォールバック */
  fireRate?: number;
  /** 弾プールの設定 - 武器未装備時のフォールバック */
  bulletPoolConfig?: BulletPoolConfig;
  /** プレイヤーステータス（MP消費・武器参照に使用、オプション） */
  playerStats?: PlayerStatsGameplayComponent;
  /** 利用可能な発射モード */
  shootingModes?: ShootingMode[];
}

/**
 * 射撃コントローラー
 * マウス方向への弾の連射を管理
 * 武器システムと連携し、装備中の武器からパラメータを取得
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.shootingController = new ShootingController(this, player, { 
 *   fireRate: 100,
 *   playerStats: this.playerStats 
 * });
 * 
 * // 武器を装備（playerStats経由）
 * this.playerStats.equipWeapon(weapon);
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

  // 射撃設定（フォールバック値）
  private defaultFireRate: number;
  private lastFireTime: number = 0;

  // 発射モード管理
  private shootingModes: ShootingMode[];
  private currentModeIndex: number = 0;

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
    this.defaultFireRate = config.fireRate ?? 100;
    this.playerStats = config.playerStats;

    // 発射モードを初期化
    this.shootingModes = config.shootingModes ?? DEFAULT_SHOOTING_MODES;

    // 弾プールを作成
    this.bulletPool = new BulletPool(scene, config.bulletPoolConfig);
  }

  /**
   * 現在の連射間隔を取得（発射モード優先、次に武器、最後にデフォルト）
   */
  private getEffectiveFireRate(): number {
    const currentMode = this.getCurrentMode();
    return currentMode.fireRate ?? this.playerStats?.getFireRate() ?? this.defaultFireRate;
  }

  /**
   * 装備中の武器を取得
   */
  private getEquippedWeapon(): RangedWeapon | null {
    return this.playerStats?.getEquippedWeapon() ?? null;
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
    // 連射間隔チェック（発射モードまたは武器の cooldown を使用）
    const fireRate = this.getEffectiveFireRate();
    if (time - this.lastFireTime < fireRate) {
      return;
    }

    // MP消費チェック（PlayerStatsが設定されている場合）
    const currentMode = this.getCurrentMode();
    const mpCost = currentMode.mpCost;
    if (this.playerStats) {
      if (!this.playerStats.canShootWithCost(mpCost)) {
        return; // MP不足で発射不可
      }
      this.playerStats.consumeMp(mpCost);
    }

    const pointer = this.scene.input.activePointer;
    const weapon = this.getEquippedWeapon();

    // 発射モードIDで発射（ShootingMode.idはBulletTypeId型）
    this.bulletPool.fireByType(
      currentMode.id,
      this.shooter.x,
      this.shooter.y,
      pointer.worldX,
      pointer.worldY,
      weapon ?? undefined
    );

    this.lastFireTime = time;
  }

  /**
   * 手動で射撃
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   */
  fireAt(targetX: number, targetY: number): void {
    const weapon = this.getEquippedWeapon();
    const currentMode = this.getCurrentMode();

    this.bulletPool.fireByType(
      currentMode.id,
      this.shooter.x,
      this.shooter.y,
      targetX,
      targetY,
      weapon ?? undefined
    );
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

  // === 発射モード管理 ===

  /**
   * 利用可能な発射モード一覧を取得
   */
  getShootingModes(): ShootingMode[] {
    return this.shootingModes;
  }

  /**
   * 現在の発射モードを取得
   */
  getCurrentMode(): ShootingMode {
    return this.shootingModes[this.currentModeIndex];
  }

  /**
   * 現在の発射モードインデックスを取得
   */
  getCurrentModeIndex(): number {
    return this.currentModeIndex;
  }

  /**
   * 発射モードを設定
   * @param mode 設定する発射モード
   */
  setShootingMode(mode: ShootingMode): void {
    const index = this.shootingModes.findIndex(m => m.id === mode.id);
    if (index !== -1) {
      this.currentModeIndex = index;
    }
  }

  /**
   * 発射モードをインデックスで設定
   * @param index モードインデックス
   */
  setShootingModeByIndex(index: number): void {
    if (index >= 0 && index < this.shootingModes.length) {
      this.currentModeIndex = index;
    }
  }

  /**
   * デフォルト連射間隔を設定（武器未装備時のフォールバック）
   */
  setFireRate(fireRate: number): void {
    this.defaultFireRate = fireRate;
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
