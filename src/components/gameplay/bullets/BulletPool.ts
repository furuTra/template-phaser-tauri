import Phaser from 'phaser';
import { Bullet, BulletConfig, BulletGameObject } from './Bullet';
import { BulletFireFactory, createBulletConfigFromWeapon } from './BulletFireFactory';
import { BulletTypeId, BULLET_TYPES, GameObjectFactory, FireResult } from './BulletTypes';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

/**
 * 弾種別サブプールの設定
 */
export interface SubPoolConfig {
  /** この弾種のプール内最大弾数（デフォルト: 20） */
  maxBullets?: number;
}

/**
 * 弾プールの設定
 */
export interface BulletPoolConfig {
  /** 各弾種のプール設定 */
  subPoolConfigs?: Partial<Record<BulletTypeId, SubPoolConfig>>;
  /** デフォルトの弾種ごとの最大弾数（デフォルト: 20） */
  defaultMaxBulletsPerType?: number;
  /** 同時に保持するサブプールの最大数（デフォルト: 3） */
  maxSubPools?: number;
}

/**
 * 弾種別サブプール
 */
interface SubPool {
  typeId: BulletTypeId;
  bullets: Bullet[];
  bulletConfig: BulletConfig;
  gameObjectFactory: GameObjectFactory;
  /** 最終使用時刻（LRU判定用） */
  lastUsedTime: number;
}

/**
 * 弾のオブジェクトプール
 * 弾種ごとにサブプールを持ち、異なる形状・設定の弾を管理
 * 
 * 遅延初期化方式：発射時に初めてサブプールを作成するため、
 * 使用しない弾種のインスタンスは作成されない
 * 
 * LRU方式：サブプール数が上限を超えると、最も古く使われたものを削除
 */
export class BulletPool {
  private scene: Phaser.Scene;
  private subPools: Map<BulletTypeId, SubPool> = new Map();
  private config: BulletPoolConfig;
  private defaultMaxBullets: number;
  private maxSubPools: number;
  
  /** サブプール作成時のコールバック（衝突判定設定用） */
  private onSubPoolCreated?: (typeId: BulletTypeId, bullets: Bullet[]) => void;
  /** サブプール削除時のコールバック（衝突判定解除用） */
  private onSubPoolDestroyed?: (typeId: BulletTypeId, bullets: Bullet[]) => void;

  constructor(scene: Phaser.Scene, config: BulletPoolConfig = {}) {
    this.scene = scene;
    this.config = config;
    this.defaultMaxBullets = config.defaultMaxBulletsPerType ?? 20;
    this.maxSubPools = config.maxSubPools ?? 3;
    // 遅延初期化: サブプールは発射時に作成される
  }

  /**
   * サブプール作成時のコールバックを設定
   * 新しい弾種が初期化されたときに呼ばれる（衝突判定の動的設定用）
   * @param callback コールバック関数
   */
  setOnSubPoolCreated(callback: (typeId: BulletTypeId, bullets: Bullet[]) => void): void {
    this.onSubPoolCreated = callback;
  }

  /**
   * サブプール削除時のコールバックを設定
   * サブプールがLRUで削除されるときに呼ばれる（衝突判定の解除用）
   * @param callback コールバック関数
   */
  setOnSubPoolDestroyed(callback: (typeId: BulletTypeId, bullets: Bullet[]) => void): void {
    this.onSubPoolDestroyed = callback;
  }

  /**
   * 指定した弾種のサブプールを取得（なければ作成）
   * @param typeId 弾の種類ID
   * @returns サブプール
   */
  private getOrCreateSubPool(typeId: BulletTypeId): SubPool {
    let subPool = this.subPools.get(typeId);
    if (subPool) {
      // 既存のサブプールの使用時刻を更新
      subPool.lastUsedTime = Date.now();
      return subPool;
    }

    // サブプール数が上限に達している場合、最も古いものを削除
    if (this.subPools.size >= this.maxSubPools) {
      this.evictLeastRecentlyUsed();
    }

    // サブプールを遅延作成
    const typeDef = BULLET_TYPES[typeId];
    if (!typeDef) {
      throw new Error(`Unknown bullet type: ${typeId}`);
    }

    const subPoolConfig = this.config.subPoolConfigs?.[typeId] ?? {};
    const maxBullets = subPoolConfig.maxBullets ?? this.defaultMaxBullets;

    subPool = {
      typeId,
      bullets: [],
      bulletConfig: typeDef.bulletConfig,
      gameObjectFactory: typeDef.gameObjectFactory,
      lastUsedTime: Date.now(),
    };

    // 弾を事前生成
    for (let i = 0; i < maxBullets; i++) {
      const gameObject = typeDef.gameObjectFactory(this.scene, -100, -100);
      const bullet = new Bullet(this.scene, gameObject, typeDef.bulletConfig);
      bullet.deactivate();
      subPool.bullets.push(bullet);
    }

    this.subPools.set(typeId, subPool);
    
    // コールバックを呼び出し（衝突判定設定用）
    this.onSubPoolCreated?.(typeId, subPool.bullets);
    
    // 新しいサブプールが作成されたことをログ出力（デバッグ用）
    console.log(`[BulletPool] Created sub-pool for '${typeId}' with ${maxBullets} bullets (total: ${this.subPools.size}/${this.maxSubPools})`);

    return subPool;
  }

  /**
   * 最も古く使われたサブプールを削除（LRU eviction）
   */
  private evictLeastRecentlyUsed(): void {
    let oldestTypeId: BulletTypeId | null = null;
    let oldestTime = Infinity;

    // 最も古いサブプールを探す（アクティブな弾がないもののみ対象）
    for (const [typeId, subPool] of this.subPools) {
      const hasActiveBullets = subPool.bullets.some(bullet => bullet.active);
      if (!hasActiveBullets && subPool.lastUsedTime < oldestTime) {
        oldestTime = subPool.lastUsedTime;
        oldestTypeId = typeId;
      }
    }

    // 削除対象が見つかった場合、削除
    if (oldestTypeId) {
      this.destroySubPool(oldestTypeId);
    } else {
      // アクティブな弾がないサブプールがない場合は警告（上限を超えて保持）
      console.warn(`[BulletPool] Cannot evict any sub-pool (all have active bullets). Current count: ${this.subPools.size}`);
    }
  }

  /**
   * 指定した弾種のサブプールを削除
   * @param typeId 弾の種類ID
   */
  private destroySubPool(typeId: BulletTypeId): void {
    const subPool = this.subPools.get(typeId);
    if (!subPool) return;

    // コールバックを呼び出し（衝突判定解除用）
    this.onSubPoolDestroyed?.(typeId, subPool.bullets);

    // 弾を破棄
    subPool.bullets.forEach(bullet => {
      bullet.destroy();
    });
    subPool.bullets = [];

    this.subPools.delete(typeId);
    
    console.log(`[BulletPool] Destroyed sub-pool for '${typeId}' (remaining: ${this.subPools.size}/${this.maxSubPools})`);
  }

  /**
   * 指定した弾種から非アクティブな弾を取得
   * @param typeId 弾の種類ID
   * @returns 利用可能な弾、または null
   */
  getAvailableBullet(typeId: BulletTypeId): Bullet | null {
    const subPool = this.getOrCreateSubPool(typeId);
    return subPool.bullets.find(bullet => !bullet.active) ?? null;
  }

  /**
   * 指定した弾種の全ての弾を取得
   * @param typeId 弾の種類ID
   */
  getBulletsByType(typeId: BulletTypeId): Bullet[] {
    return this.subPools.get(typeId)?.bullets ?? [];
  }

  /**
   * 全ての弾を取得（初期化済みの弾種のみ）
   */
  getAllBullets(): Bullet[] {
    const allBullets: Bullet[] = [];
    for (const subPool of this.subPools.values()) {
      allBullets.push(...subPool.bullets);
    }
    return allBullets;
  }

  /**
   * 全ての弾のGameObjectを取得（初期化済みの弾種のみ、衝突判定用）
   * 注意: 遅延初期化のため、発射されていない弾種は含まれない
   */
  getGameObjects(): BulletGameObject[] {
    return this.getAllBullets().map(bullet => bullet.gameObject);
  }

  /**
   * 指定した弾種のGameObjectを取得
   * @param typeId 弾の種類ID
   */
  getGameObjectsByType(typeId: BulletTypeId): BulletGameObject[] {
    return this.getBulletsByType(typeId).map(bullet => bullet.gameObject);
  }

  /**
   * GameObjectからBulletを取得
   */
  getBulletByGameObject(gameObject: BulletGameObject): Bullet | undefined {
    for (const subPool of this.subPools.values()) {
      const found = subPool.bullets.find(bullet => bullet.gameObject === gameObject);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * 初期化済みの弾種一覧を取得
   */
  getInitializedTypes(): BulletTypeId[] {
    return Array.from(this.subPools.keys());
  }

  /**
   * サブプールが初期化されているか確認
   * @param typeId 弾の種類ID
   */
  isTypeInitialized(typeId: BulletTypeId): boolean {
    return this.subPools.has(typeId);
  }

  /**
   * 指定した弾種のサブプールを事前に初期化（衝突判定設定用）
   * @param typeId 弾の種類ID
   */
  preloadType(typeId: BulletTypeId): void {
    this.getOrCreateSubPool(typeId);
  }

  /**
   * 複数の弾種を事前に初期化
   * @param typeIds 弾の種類ID配列
   */
  preloadTypes(typeIds: BulletTypeId[]): void {
    for (const typeId of typeIds) {
      this.getOrCreateSubPool(typeId);
    }
  }

  // === 基本発射メソッド ===

  /**
   * 単発発射（指定した弾種で）
   * @param typeId 弾の種類ID
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fire(
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number
  ): Bullet | null {
    const result = BulletFireFactory.fireSingle(
      () => this.getAvailableBullet(typeId),
      { fromX, fromY, targetX, targetY }
    );
    return result.bullets[0] ?? null;
  }

  /**
   * カスタム設定で単発発射
   * @param typeId 弾の種類ID
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param config 弾の設定
   * @returns 発射した弾、または利用可能な弾がない場合はnull
   */
  fireWithConfig(
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    config: BulletConfig
  ): Bullet | null {
    const result = BulletFireFactory.fireSingle(
      () => this.getAvailableBullet(typeId),
      { fromX, fromY, targetX, targetY, config }
    );
    return result.bullets[0] ?? null;
  }

  // === 種類別発射メソッド ===

  /**
   * 3方向発射
   * @param typeId 弾の種類ID
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param config 弾の設定（オプション）
   * @returns 発射結果
   */
  fireTriple(
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    config?: BulletConfig
  ): FireResult {
    return BulletFireFactory.fireTriple(
      () => this.getAvailableBullet(typeId),
      { fromX, fromY, targetX, targetY, config }
    );
  }

  /**
   * 拡散発射
   * @param typeId 弾の種類ID
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
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    shotCount: number = 5,
    spreadAngle: number = 40,
    config?: BulletConfig
  ): FireResult {
    return BulletFireFactory.fireSpread(
      () => this.getAvailableBullet(typeId),
      { fromX, fromY, targetX, targetY, config },
      shotCount,
      spreadAngle
    );
  }

  /**
   * 武器設定で発射
   * @param typeId 弾の種類ID
   * @param fromX 発射元X座標
   * @param fromY 発射元Y座標
   * @param targetX 目標X座標
   * @param targetY 目標Y座標
   * @param weapon 遠距離武器
   * @returns 発射結果
   */
  fireWithWeapon(
    typeId: BulletTypeId,
    fromX: number,
    fromY: number,
    targetX: number,
    targetY: number,
    weapon: RangedWeapon
  ): FireResult {
    return BulletFireFactory.fireWithWeapon(
      () => this.getAvailableBullet(typeId),
      { fromX, fromY, targetX, targetY },
      weapon
    );
  }

  /**
   * 種類IDを指定して発射（弾種に応じた発射パターンを自動選択）
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
      () => this.getAvailableBullet(typeId),
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
    for (const subPool of this.subPools.values()) {
      subPool.bullets.forEach((bullet) => {
        bullet.update(time, delta);
      });
    }
  }

  /**
   * 全ての弾を非アクティブ化
   */
  deactivateAll(): void {
    for (const subPool of this.subPools.values()) {
      subPool.bullets.forEach((bullet) => {
        bullet.deactivate();
      });
    }
  }

  /**
   * 指定した弾種の弾を全て非アクティブ化
   * @param typeId 弾の種類ID
   */
  deactivateByType(typeId: BulletTypeId): void {
    const subPool = this.subPools.get(typeId);
    if (subPool) {
      subPool.bullets.forEach((bullet) => {
        bullet.deactivate();
      });
    }
  }

  /**
   * アクティブな弾の数を取得（全弾種）
   */
  getActiveBulletCount(): number {
    let count = 0;
    for (const subPool of this.subPools.values()) {
      count += subPool.bullets.filter((bullet) => bullet.active).length;
    }
    return count;
  }

  /**
   * 指定した弾種のアクティブな弾の数を取得
   * @param typeId 弾の種類ID
   */
  getActiveBulletCountByType(typeId: BulletTypeId): number {
    const subPool = this.subPools.get(typeId);
    if (!subPool) return 0;
    return subPool.bullets.filter((bullet) => bullet.active).length;
  }

  /**
   * 指定した弾種の弾設定を取得
   * @param typeId 弾の種類ID
   */
  getBulletConfig(typeId: BulletTypeId): BulletConfig | undefined {
    return this.subPools.get(typeId)?.bulletConfig;
  }

  /**
   * 破棄
   */
  destroy(): void {
    for (const subPool of this.subPools.values()) {
      subPool.bullets.forEach((bullet) => {
        bullet.destroy();
      });
      subPool.bullets = [];
    }
    this.subPools.clear();
  }
}
