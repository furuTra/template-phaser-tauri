import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';

/**
 * TripleBullet用のデフォルト設定
 * SingleBulletと同じ特性（発射パターンが異なる）
 */
export const TRIPLE_BULLET_CONFIG: BulletConfig = {
  width: 16,
  height: 8,
  color: 0xffff00,
  speed: 500,
  lifespan: 2000,
};

/**
 * 3方向弾クラス
 * 弾自体はSingleBulletと同じ特性。
 * 3方向発射パターンで使用される。
 */
export class TripleBullet extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...TRIPLE_BULLET_CONFIG, ...config });
  }
}
