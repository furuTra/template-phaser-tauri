import type { Bullet } from '@/components/gameplay/Bullet';
import type { BulletConfig } from '@/components/gameplay/Bullet';

/**
 * 弾の種類ID
 */
export type BulletTypeId = 'single' | 'triple' | 'spread' | 'rapid' | 'heavy';

/**
 * 弾の種類定義
 */
export interface BulletTypeDefinition {
  /** 種類ID */
  id: BulletTypeId;
  /** 表示名 */
  name: string;
  /** 説明 */
  description: string;
  /** 同時発射数 */
  shotCount: number;
  /** 拡散角度（度数、複数弾の場合） */
  spreadAngle?: number;
}

/**
 * 弾の種類定義マップ
 */
export const BULLET_TYPES: Record<BulletTypeId, BulletTypeDefinition> = {
  single: {
    id: 'single',
    name: '単発',
    description: '通常の射撃',
    shotCount: 1,
  },
  triple: {
    id: 'triple',
    name: '3方向',
    description: '3方向に同時発射',
    shotCount: 3,
    spreadAngle: 20,
  },
  spread: {
    id: 'spread',
    name: '拡散',
    description: '5方向に拡散発射',
    shotCount: 5,
    spreadAngle: 40,
  },
  rapid: {
    id: 'rapid',
    name: '連射',
    description: '高速連射',
    shotCount: 1,
  },
  heavy: {
    id: 'heavy',
    name: '重弾',
    description: '高威力の重い弾',
    shotCount: 1,
  },
};

/**
 * 発射結果
 */
export interface FireResult {
  /** 発射した弾の配列 */
  bullets: Bullet[];
  /** 発射成功数 */
  successCount: number;
}

/**
 * 発射パラメータ
 */
export interface FireParams {
  /** 発射元X座標 */
  fromX: number;
  /** 発射元Y座標 */
  fromY: number;
  /** 目標X座標 */
  targetX: number;
  /** 目標Y座標 */
  targetY: number;
  /** 弾設定（オプション） */
  config?: BulletConfig;
}
