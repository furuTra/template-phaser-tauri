/**
 * 武器関連の列挙型・共通型定義
 * game-object.md の仕様に準拠
 */

// === 弾速タイプ ===
export type VelocityType = 'constant' | 'accelerate' | 'decelerate';

// === 弾軌道タイプ ===
export type TrajectoryType = 'straight' | 'homing' | 'arc' | 'wave' | 'spiral';

// === 攻撃タイプ ===
export type AttackType = 'melee' | 'projectile' | 'area';

// === 特殊効果タイプ ===
export type EffectType = 'explosion' | 'pierce' | 'spread' | 'bounce' | 'split';

// === 弾速設定 ===
export interface VelocityConfig {
  /** 弾速タイプ */
  type: VelocityType;
  /** 初速 */
  initialSpeed: number;
  /** 加速度（加速・減速型のみ） */
  acceleration?: number;
}

// === 弾軌道設定 ===
export interface TrajectoryConfig {
  /** 軌道タイプ */
  type: TrajectoryType;
  /** 追尾強度（追尾型のみ、0-1） */
  homingStrength?: number;
  /** 放物線高さ（放物線型のみ） */
  arcHeight?: number;
  /** 波の振幅（波型のみ） */
  waveAmplitude?: number;
  /** 波の周波数（波型のみ） */
  waveFrequency?: number;
  /** スパイラルの半径（スパイラル型のみ） */
  spiralRadius?: number;
}

// === 特殊効果設定 ===
export interface EffectConfig {
  /** 効果タイプ */
  type: EffectType;
  /** 爆発半径（explosion用） */
  explosionRadius?: number;
  /** 貫通数（pierce用） */
  pierceCount?: number;
  /** 拡散数（spread用） */
  spreadCount?: number;
  /** 拡散角度（spread用、度数） */
  spreadAngle?: number;
  /** 反射回数（bounce用） */
  bounceCount?: number;
  /** 分裂数（split用） */
  splitCount?: number;
}

// === デフォルト値生成関数 ===

/**
 * デフォルトの弾速設定を生成
 */
export function createDefaultVelocityConfig(): VelocityConfig {
  return {
    type: 'constant',
    initialSpeed: 500,
  };
}

/**
 * デフォルトの弾軌道設定を生成
 */
export function createDefaultTrajectoryConfig(): TrajectoryConfig {
  return {
    type: 'straight',
  };
}
