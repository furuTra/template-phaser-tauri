import Phaser from 'phaser';

/**
 * 敵の設定
 */
export interface EnemyConfig {
  /** 敵の幅（デフォルト: 40） */
  width?: number;
  /** 敵の高さ（デフォルト: 40） */
  height?: number;
  /** 敵の色（デフォルト: 0xff4444） */
  color?: number;
  /** 最大HP（デフォルト: 100） */
  maxHp?: number;
  /** 現在のHP（デフォルト: maxHpと同じ） */
  hp?: number;
}

/**
 * デフォルトの敵設定
 */
export const DEFAULT_ENEMY_CONFIG: Required<Omit<EnemyConfig, 'hp'>> = {
  width: 40,
  height: 40,
  color: 0xff4444,
  maxHp: 100,
};

/**
 * 敵テクスチャのキーを生成
 */
function getEnemyTextureKey(width: number, height: number, color: number): string {
  return `enemy_${width}_${height}_${color.toString(16)}`;
}

/**
 * 敵ゲームプレイコンポーネント
 * 攻撃を受けてダメージを受ける静止した敵
 * Phaser.Physics.Arcade.Spriteを継承し、物理判定を持つ
 */
export class EnemyGameplayComponent extends Phaser.Physics.Arcade.Sprite {
  private maxHp: number;
  private currentHp: number;
  private hpBarBackground!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private readonly hpBarWidth: number;
  private readonly hpBarHeight: number = 6;
  private readonly hpBarOffset: number = 10;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig = {}) {
    const width = config.width ?? DEFAULT_ENEMY_CONFIG.width;
    const height = config.height ?? DEFAULT_ENEMY_CONFIG.height;
    const color = config.color ?? DEFAULT_ENEMY_CONFIG.color;
    const textureKey = getEnemyTextureKey(width, height, color);

    // テクスチャが存在しない場合は動的に生成
    if (!scene.textures.exists(textureKey)) {
      const graphics = scene.add.graphics();
      graphics.fillStyle(color);
      graphics.fillRect(0, 0, width, height);
      graphics.generateTexture(textureKey, width, height);
      graphics.destroy();
    }

    super(scene, x, y, textureKey);

    this.maxHp = config.maxHp ?? DEFAULT_ENEMY_CONFIG.maxHp;
    this.currentHp = config.hp ?? this.maxHp;
    this.hpBarWidth = width;

    // シーンに追加
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 物理ボディの設定
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);

    // HPバーを作成
    this.createHpBar();
  }

  /**
   * HPバーを作成
   */
  private createHpBar(): void {
    const barY = this.y - this.height / 2 - this.hpBarOffset;
    const barLeft = this.x - this.hpBarWidth / 2;

    // 背景（黒）
    this.hpBarBackground = this.scene.add.rectangle(
      this.x,
      barY,
      this.hpBarWidth,
      this.hpBarHeight,
      0x000000,
      0.8
    );

    // HP表示（緑→赤のグラデーション）- 左端基準
    this.hpBarFill = this.scene.add.rectangle(
      barLeft,
      barY,
      this.hpBarWidth,
      this.hpBarHeight,
      0x00ff00
    );
    this.hpBarFill.setOrigin(0, 0.5); // 左端を基準にする

    this.updateHpBar();
  }

  /**
   * HPバーを更新
   */
  private updateHpBar(): void {
    const hpRatio = this.currentHp / this.maxHp;
    const fillWidth = this.hpBarWidth * hpRatio;

    // バーの幅を更新（左端基準なので位置はそのまま）
    this.hpBarFill.width = fillWidth;

    // HPに応じて色を変更（緑→黄→赤）
    let color: number;
    if (hpRatio > 0.5) {
      color = 0x00ff00; // 緑
    } else if (hpRatio > 0.25) {
      color = 0xffff00; // 黄
    } else {
      color = 0xff0000; // 赤
    }
    this.hpBarFill.setFillStyle(color);
  }

  /**
   * ダメージを受ける
   * @param damage ダメージ量
   * @returns 死亡した場合true
   */
  takeDamage(damage: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - damage);
    this.updateHpBar();

    // ダメージエフェクト（点滅）
    this.flashDamage();

    if (this.currentHp <= 0) {
      this.die();
      return true;
    }

    return false;
  }

  /**
   * ダメージ時の点滅エフェクト
   */
  private flashDamage(): void {
    // 白く点滅
    this.setTint(0xffffff);
    
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }

  /**
   * 死亡処理
   */
  private die(): void {
    // 死亡エフェクト（フェードアウト）
    this.scene.tweens.add({
      targets: [this, this.hpBarBackground, this.hpBarFill],
      alpha: 0,
      scale: 0.5,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  /**
   * 現在のHPを取得
   */
  getHp(): number {
    return this.currentHp;
  }

  /**
   * 最大HPを取得
   */
  getMaxHp(): number {
    return this.maxHp;
  }

  /**
   * 生存しているかどうか
   */
  isAlive(): boolean {
    return this.currentHp > 0;
  }

  /**
   * 毎フレーム更新（HPバーの位置を追従）
   */
  preUpdate(): void {
    if (!this.active) return;

    const barY = this.y - this.height / 2 - this.hpBarOffset;
    const barLeft = this.x - this.hpBarWidth / 2;

    // HPバーの位置を更新
    this.hpBarBackground.setPosition(this.x, barY);
    this.hpBarFill.setPosition(barLeft, barY);
  }

  /**
   * 破棄時の処理
   */
  destroy(fromScene?: boolean): void {
    // HPバーも破棄
    this.hpBarBackground?.destroy();
    this.hpBarFill?.destroy();
    super.destroy(fromScene);
  }
}
