import Phaser from 'phaser';
import { Bullet, BulletConfig } from './Bullet';
import {
  BulletTypeId,
  BULLET_TYPES,
  FireParams,
  FireResult,
} from './BulletTypes';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

/**
 * 武器から弾の設定を生成
 * @param weapon 遠距離武器
 * @returns 弾の設定
 */
export function createBulletConfigFromWeapon(weapon: RangedWeapon): BulletConfig {
  return {
    speed: weapon.velocity.initialSpeed,
    lifespan: (weapon.range / weapon.velocity.initialSpeed) * 1000,
  };
}

/**
 * 弾発射ファクトリ
 * 弾の種類ごとの発射ロジックを管理
 */
export class BulletFireFactory {
  /**
   * 単発発射
   * @param getBullet 弾を取得する関数
   * @param params 発射パラメータ
   * @returns 発射結果
   */
  static fireSingle(
    getBullet: () => Bullet | null,
    params: FireParams
  ): FireResult {
    const bullet = getBullet();
    if (!bullet) {
      return { bullets: [], successCount: 0 };
    }

    if (params.config) {
      bullet.applyConfig(params.config);
    }
    bullet.fire(params.fromX, params.fromY, params.targetX, params.targetY);
    return { bullets: [bullet], successCount: 1 };
  }

  /**
   * 3方向発射
   * @param getBullet 弾を取得する関数
   * @param params 発射パラメータ
   * @returns 発射結果
   */
  static fireTriple(
    getBullet: () => Bullet | null,
    params: FireParams
  ): FireResult {
    return this.fireSpread(getBullet, params, 3, 20);
  }

  /**
   * 拡散発射
   * @param getBullet 弾を取得する関数
   * @param params 発射パラメータ
   * @param shotCount 発射数（デフォルト: 5）
   * @param totalSpreadDegrees 総拡散角度（度数、デフォルト: 40）
   * @returns 発射結果
   */
  static fireSpread(
    getBullet: () => Bullet | null,
    params: FireParams,
    shotCount: number = 5,
    totalSpreadDegrees: number = 40
  ): FireResult {
    const bullets: Bullet[] = [];
    const baseAngle = Phaser.Math.Angle.Between(
      params.fromX, params.fromY,
      params.targetX, params.targetY
    );

    const totalSpreadRad = Phaser.Math.DegToRad(totalSpreadDegrees);
    const startAngle = baseAngle - totalSpreadRad / 2;
    const angleStep = shotCount > 1 ? totalSpreadRad / (shotCount - 1) : 0;

    for (let i = 0; i < shotCount; i++) {
      const bullet = getBullet();
      if (!bullet) continue;

      if (params.config) {
        bullet.applyConfig(params.config);
      }

      const angle = shotCount === 1 ? baseAngle : startAngle + angleStep * i;
      bullet.fireAtAngle(params.fromX, params.fromY, angle);
      bullets.push(bullet);
    }

    return { bullets, successCount: bullets.length };
  }

  /**
   * 武器設定で発射（同時発射数と角度オフセット対応）
   * @param getBullet 弾を取得する関数
   * @param params 発射パラメータ
   * @param weapon 遠距離武器
   * @returns 発射結果
   */
  static fireWithWeapon(
    getBullet: () => Bullet | null,
    params: FireParams,
    weapon: RangedWeapon
  ): FireResult {
    const bullets: Bullet[] = [];
    const baseAngle = Phaser.Math.Angle.Between(
      params.fromX, params.fromY,
      params.targetX, params.targetY
    );

    const config = createBulletConfigFromWeapon(weapon);

    for (let i = 0; i < weapon.simultaneousShots; i++) {
      const bullet = getBullet();
      if (!bullet) continue;

      bullet.applyConfig(config);

      // 角度オフセットを計算（中央を基準に左右に拡散）
      let angleOffset = 0;
      if (weapon.simultaneousShots > 1) {
        const totalSpread = Phaser.Math.DegToRad(weapon.angleOffset * 2);
        const step = totalSpread / (weapon.simultaneousShots - 1);
        angleOffset = -totalSpread / 2 + step * i;
      }

      const finalAngle = baseAngle + angleOffset;
      bullet.fireAtAngle(params.fromX, params.fromY, finalAngle);
      bullets.push(bullet);
    }

    return { bullets, successCount: bullets.length };
  }

  /**
   * 種類IDに基づいて発射
   * @param typeId 弾の種類ID
   * @param getBullet 弾を取得する関数
   * @param params 発射パラメータ
   * @param weapon 遠距離武器（オプション）
   * @returns 発射結果
   */
  static fireByType(
    typeId: BulletTypeId,
    getBullet: () => Bullet | null,
    params: FireParams,
    weapon?: RangedWeapon
  ): FireResult {
    // 武器設定から弾設定を生成
    if (weapon && !params.config) {
      params.config = createBulletConfigFromWeapon(weapon);
    }

    const typeDef = BULLET_TYPES[typeId];

    switch (typeId) {
      case 'single':
      case 'rapid':
      case 'heavy':
        return this.fireSingle(getBullet, params);
      
      case 'triple':
        return this.fireTriple(getBullet, params);
      
      case 'spread':
        return this.fireSpread(
          getBullet,
          params,
          typeDef.shotCount,
          typeDef.spreadAngle
        );
      
      default:
        return this.fireSingle(getBullet, params);
    }
  }
}
