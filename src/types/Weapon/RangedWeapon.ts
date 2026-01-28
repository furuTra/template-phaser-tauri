import type { BaseWeapon } from '@/types/Weapon/BaseWeapon';
import type {
  VelocityConfig,
  TrajectoryConfig,
  EffectConfig,
} from '@/types/Weapon/WeaponTypes';
import {
  createDefaultVelocityConfig,
  createDefaultTrajectoryConfig,
} from '@/types/Weapon/WeaponTypes';

/**
 * 遠距離武器インターフェース
 * game-object.md の仕様に準拠
 */
export interface RangedWeapon extends BaseWeapon {
  // === 弾数設定 ===
  /** 制限弾数（null = 無限弾） */
  maxAmmo: number | null;
  /** 現在の残弾数 */
  currentAmmo: number | null;

  // === 弾速設定 ===
  /** 弾速設定 */
  velocity: VelocityConfig;

  // === 弾軌道設定 ===
  /** 軌道設定 */
  trajectory: TrajectoryConfig;

  // === 特殊性能 ===
  /** 特殊効果配列 */
  effects: EffectConfig[];
  /** 射程距離 */
  range: number;
  /** 同時発射数 */
  simultaneousShots: number;
  /** 発射角度オフセット（度数、複数弾発射時の拡散角） */
  angleOffset: number;

  // === 弾の見た目 ===
  /** 弾の幅 */
  bulletWidth: number;
  /** 弾の高さ */
  bulletHeight: number;
  /** 弾の色 */
  bulletColor: number;
}

/**
 * デフォルトの遠距離武器を生成
 */
export function createDefaultRangedWeapon(id: string, name: string): RangedWeapon {
  return {
    id,
    name,
    description: '',
    attackPower: 10,
    mpCost: 15,
    cooldown: 100,
    maxAmmo: null,
    currentAmmo: null,
    velocity: createDefaultVelocityConfig(),
    trajectory: createDefaultTrajectoryConfig(),
    effects: [],
    range: 1000,
    simultaneousShots: 1,
    angleOffset: 0,
    bulletWidth: 16,
    bulletHeight: 8,
    bulletColor: 0xffff00,
  };
}

/**
 * 遠距離武器かどうかを判定する型ガード
 */
export function isRangedWeapon(weapon: BaseWeapon): weapon is RangedWeapon {
  return 'velocity' in weapon && 'trajectory' in weapon;
}
