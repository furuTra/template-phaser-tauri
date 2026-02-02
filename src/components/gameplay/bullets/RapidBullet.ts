import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';

/**
 * RapidBullet用のデフォルト設定
 */
export const RAPID_BULLET_CONFIG: BulletConfig = {
  width: 12,
  height: 6,
  color: 0x00ffff,
  speed: 700,
  lifespan: 1500,
};

/**
 * 連射弾クラス
 * 小さく高速な弾。連射に適している。
 */
export class RapidBullet extends Bullet {
  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...RAPID_BULLET_CONFIG, ...config });
  }
}
