/**
 * 武器基底インターフェース
 * game-object.md の仕様に準拠
 */

// === 武器基底 ===
export interface BaseWeapon {
  /** 武器ID */
  readonly id: string;
  /** 武器名 */
  name: string;
  /** 説明 */
  description: string;

  // === 基本性能 ===
  /** 攻撃力 */
  attackPower: number;
  /** 消費MP */
  mpCost: number;
  /** 攻撃間隔（ミリ秒） */
  cooldown: number;
}

/**
 * デフォルトの武器基本設定を生成
 */
export function createDefaultBaseWeapon(id: string, name: string): BaseWeapon {
  return {
    id,
    name,
    description: '',
    attackPower: 10,
    mpCost: 10,
    cooldown: 500,
  };
}
