import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';

/**
 * HeavyBullet用のデフォルト設定
 */
export const HEAVY_BULLET_CONFIG: BulletConfig = {
  width: 24,
  height: 12,
  color: 0xff6600,
  speed: 350,
  lifespan: 3000,
};

/**
 * 重弾クラス
 * 大きく低速だが高威力の弾。
 * 将来的に貫通効果などを追加可能。
 */
export class HeavyBullet extends Bullet {
  /** 貫通回数 */
  private pierceCount: number = 0;
  /** 最大貫通回数 */
  private maxPierceCount: number = 3;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...HEAVY_BULLET_CONFIG, ...config });
  }

  /**
   * 貫通回数を取得
   */
  getPierceCount(): number {
    return this.pierceCount;
  }

  /**
   * 最大貫通回数を取得
   */
  getMaxPierceCount(): number {
    return this.maxPierceCount;
  }

  /**
   * 最大貫通回数を設定
   */
  setMaxPierceCount(count: number): void {
    this.maxPierceCount = count;
  }

  /**
   * 貫通処理
   * @returns まだ貫通可能ならtrue
   */
  pierce(): boolean {
    this.pierceCount++;
    if (this.pierceCount >= this.maxPierceCount) {
      this.deactivate();
      return false;
    }
    return true;
  }

  /**
   * 弾を非アクティブ化（貫通カウントもリセット）
   */
  override deactivate(): void {
    super.deactivate();
    this.pierceCount = 0;
  }
}
