import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';

/**
 * SingleBullet用のデフォルト設定
 */
export const SINGLE_BULLET_CONFIG: BulletConfig = {
  width: 16,
  height: 8,
  color: 0xffff00,
  speed: 500,
  lifespan: 2000,
};

/**
 * 単発弾クラス
 * 標準的な弾。直線軌道で飛行する。
 */
export class SingleBullet extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...SINGLE_BULLET_CONFIG, ...config });
  }
}
