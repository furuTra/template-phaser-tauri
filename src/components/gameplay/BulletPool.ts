import Phaser from 'phaser';
import { Bullet, BulletConfig, DEFAULT_BULLET_CONFIG } from '@/components/gameplay/Bullet';
import { SingleBullet } from '@/components/gameplay/bullets/SingleBullet';
import { TripleBullet } from '@/components/gameplay/bullets/TripleBullet';
import { SpreadBullet } from '@/components/gameplay/bullets/SpreadBullet';
import { RapidBullet } from '@/components/gameplay/bullets/RapidBullet';
import { HeavyBullet } from '@/components/gameplay/bullets/HeavyBullet';
import { BulletFireFactory, createBulletConfigFromWeapon } from '@/components/gameplay/BulletFireFactory';
import type { BulletTypeId, FireResult } from '@/components/gameplay/BulletTypes';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

/**
 * BulletTypeIdからBulletクラスを取得するマップ
 */
type BulletConstructor = new (scene: Phaser.Scene, x: number, y: number, config?: BulletConfig) => Bullet;

const BULLET_CLASS_MAP: Record<BulletTypeId, BulletConstructor> = {
  single: SingleBullet,
  triple: TripleBullet,
  spread: SpreadBullet,
  rapid: RapidBullet,
  heavy: HeavyBullet,
};

/**
 * 弾プールの設定
 */
export interface BulletPoolConfig {
  /** プール内の最大弾数（デフォルト: 50） */
  maxBullets?: number;
  /** 弾の設定 */
  bulletConfig?: BulletConfig;
  /** 使用する弾の種類（デフォルト: 'single'） */
  bulletType?: BulletTypeId;
}

/**
 * 弾のオブジェクトプール
 * パフォーマンス最適化のため、弾を再利用
 */
export class BulletPool extends Phaser.GameObjects.Group {
  private bulletConfig: BulletConfig;
  private bulletType: BulletTypeId;

  constructor(scene: Phaser.Scene, config: BulletPoolConfig = {}) {
    super(scene);

    const maxBullets = config.maxBullets ?? 50;
    this.bulletConfig = config.bulletConfig ?? { ...DEFAULT_BULLET_CONFIG };
    this.bulletType = config.bulletType ?? 'single';

    // 指定された弾種で弾を事前生成
    const BulletClass = BULLET_CLASS_MAP[this.bulletType];
    for (let i = 0; i < maxBullets; i++) {
      const bullet = new BulletClass(scene, -100, -100, this.bulletConfig);
      bullet.deactivate();
      this.add(bullet);
    }
  }

  /**
   * 非アクティブな弾を取得
   * @returns 利用可能な弾、または null
   */
  getAvailableBullet(): Bullet | null {
    return this.getFirstDead(false) as Bullet | null;
  }

  // === 基本発射メソッド ===

  /**
   * 単発発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fire(fromX: number, fromY: number, targetX: number, targetY: number): Bullet | null {
    const result = BulletFireFactory.fireSingle(
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY }
    );
    return result.bullets[0] ?? null;
  }

  /**
   * カスタム設定で単発発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param config 弾の設定
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fireWithConfig(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    config: BulletConfig
  ): Bullet | null {
    const result = BulletFireFactory.fireSingle(
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY, config }
    );
    return result.bullets[0] ?? null;
  }

  // === 種類別発射メソッド ===

  /**
   * 3方向発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param config 弾の設定（オプション）
   * @returns 発射結果
   */
  fireTriple(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    config?: BulletConfig
  ): FireResult {
    return BulletFireFactory.fireTriple(
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY, config }
    );
  }

  /**
   * 拡散発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param shotCount 発射数（デフォルト: 5）
   * @param spreadAngle 総拡散角度（度数、デフォルト: 40）
   * @param config 弾の設定（オプション）
   * @returns 発射結果
   */
  fireSpread(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    shotCount: number = 5,
    spreadAngle: number = 40,
    config?: BulletConfig
  ): FireResult {
    return BulletFireFactory.fireSpread(
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY, config },
      shotCount,
      spreadAngle
    );
  }

  /**
   * 武器設定で発射
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param weapon 遠距離武器
   * @returns 発射結果
   */
  fireWithWeapon(
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    weapon: RangedWeapon
  ): FireResult {
    return BulletFireFactory.fireWithWeapon(
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY },
      weapon
    );
  }

  /**
   * 種類IDを指定して発射
   * @param typeId 弾の種類ID
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param weapon 遠距離武器（オプション）
   * @returns 発射結果
   */
  fireByType(
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    weapon?: RangedWeapon
  ): FireResult {
    const config = weapon ? createBulletConfigFromWeapon(weapon) : undefined;
    return BulletFireFactory.fireByType(
      typeId,
      () => this.getAvailableBullet(),
      { fromX, fromY, targetX, targetY, config },
      weapon
    );
  }

  // === ユーティリティ ===

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

  /**
   * アクティブな弾の数を取得
   */
  getActiveBulletCount(): number {
    return this.getChildren().filter((bullet) => bullet.active).length;
  }

  /**
   * プールの弾設定を更新
   * @param config 新しい弾設定
   */
  setBulletConfig(config: BulletConfig): void {
    this.bulletConfig = { ...this.bulletConfig, ...config };
  }

  /**
   * プールの弾設定を取得
   */
  getBulletConfig(): BulletConfig {
    return { ...this.bulletConfig };
  }

  /**
   * プールの弾種を取得
   */
  getBulletType(): BulletTypeId {
    return this.bulletType;
  }
}
