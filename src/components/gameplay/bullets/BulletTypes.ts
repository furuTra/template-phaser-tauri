import Phaser from 'phaser';
import type { Bullet } from './Bullet';
import type { BulletConfig, BulletGameObject } from './Bullet';

/**
 * 弾の種類ID
 */
export type BulletTypeId = 'single' | 'triple' | 'spread' | 'rapid' | 'heavy';

/**
 * 図形生成関数の型
 */
export type GameObjectFactory = (scene: Phaser.Scene, x: number, y: number) => BulletGameObject;

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
  /** 弾の設定 */
  bulletConfig: BulletConfig;
  /** GameObject生成関数 */
  gameObjectFactory: GameObjectFactory;
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
    bulletConfig: {
      speed: 500,
      lifespan: 2000,
      damage: 10,
    },
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 16, 8, 0xffff00),
  },
  triple: {
    id: 'triple',
    name: '3方向',
    description: '3方向に同時発射',
    shotCount: 3,
    spreadAngle: 20,
    bulletConfig: {
      speed: 500,
      lifespan: 2000,
      damage: 10,
    },
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 16, 8, 0xff22ff),
  },
  spread: {
    id: 'spread',
    name: '拡散',
    description: '5方向に拡散発射',
    shotCount: 5,
    spreadAngle: 40,
    bulletConfig: {
      speed: 480,
      lifespan: 1800,
      damage: 8,
    },
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 14, 7, 0x0000ff),
  },
  rapid: {
    id: 'rapid',
    name: '連射',
    description: '高速連射',
    shotCount: 1,
    bulletConfig: {
      speed: 700,
      lifespan: 1500,
      damage: 5,
    },
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 12, 6, 0x00ffff),
  },
  heavy: {
    id: 'heavy',
    name: '重弾',
    description: '高威力の重い弾',
    shotCount: 1,
    bulletConfig: {
      speed: 350,
      lifespan: 3000,
      damage: 25,
    },
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 24, 12, 0xff6600),
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
