import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';

/**
 * SpreadBullet用のデフォルト設定
 * SingleBulletと同じ特性（発射パターンが異なる）
 */
export const SPREAD_BULLET_CONFIG: BulletConfig = {
  width: 14,
  height: 7,
  color: 0xffff00,
  speed: 480,
  lifespan: 1800,
};

/**
 * 拡散弾クラス
 * SingleBulletとほぼ同じ特性。やや小さく短射程。
 * 拡散発射パターンで使用される。
 */
export class SpreadBullet extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...SPREAD_BULLET_CONFIG, ...config });
  }
}
