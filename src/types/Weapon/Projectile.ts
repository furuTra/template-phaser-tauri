import type {
  VelocityConfig,
  TrajectoryConfig,
  EffectConfig,
} from '@/types/Weapon/WeaponTypes';

/**
 * 弾丸インスタンスのインターフェース
 * game-object.md の仕様に準拠
 */
export interface Projectile {
  // === 基本情報 ===
  /** 弾丸インスタンスID */
  readonly id: string;
  /** 発射元ID（プレイヤーまたは敵） */
  ownerId: string;
  /** 使用武器ID */
  weaponId: string;
  /** ダメージ量 */
  damage: number;

  // === 位置・速度 ===
  /** 現在X座標 */
  x: number;
  /** 現在Y座標 */
  y: number;
  /** X方向速度 */
  velocityX: number;
  /** Y方向速度 */
  velocityY: number;
  /** 回転角度（ラジアン） */
  rotation: number;

  // === 設定（武器から継承） ===
  /** 弾速設定 */
  velocity: VelocityConfig;
  /** 軌道設定 */
  trajectory: TrajectoryConfig;
  /** 特殊効果配列 */
  effects: EffectConfig[];
  /** 最大射程 */
  maxRange: number;

  // === 状態 ===
  /** 有効フラグ */
  isActive: boolean;
  /** 移動距離 */
  traveledDistance: number;
  /** 追尾中のターゲットID（追尾型のみ） */
  targetId: string | null;
  /** 貫通済み数 */
  pierceCount: number;
  /** 反射済み数 */
  bounceCount: number;
}

/**
 * 弾丸の初期状態を生成
 */
export function createProjectile(
  id: string,
  ownerId: string,
  weaponId: string,
  damage: number,
  x: number,
  y: number,
  velocity: VelocityConfig,
  trajectory: TrajectoryConfig,
  effects: EffectConfig[],
  maxRange: number
): Projectile {
  return {
    id,
    ownerId,
    weaponId,
    damage,
    x,
    y,
    velocityX: 0,
    velocityY: 0,
    rotation: 0,
    velocity,
    trajectory,
    effects,
    maxRange,
    isActive: true,
    traveledDistance: 0,
    targetId: null,
    pierceCount: 0,
    bounceCount: 0,
  };
}
