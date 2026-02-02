import Phaser from 'phaser';
import { Bullet, BulletConfig } from '@/components/gameplay/Bullet';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

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
 * 武器から弾の設定を生成
 * @param weapon 遠距離武器
 * @returns 弾の設定
 */
export function createBulletConfigFromWeapon(weapon: RangedWeapon): BulletConfig {
  return {
    width: weapon.bulletWidth,
    height: weapon.bulletHeight,
    color: weapon.bulletColor,
    speed: weapon.velocity.initialSpeed,
    lifespan: (weapon.range / weapon.velocity.initialSpeed) * 1000,
  };
}

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
