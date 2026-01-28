import Phaser from 'phaser';

/**
 * プレイヤーステータスの設定
 */
export interface PlayerStatsConfig {
  /** 最大HP（デフォルト: 100） */
  maxHp?: number;
  /** 初期HP（デフォルト: maxHp） */
  initialHp?: number;
  /** 最大MP（デフォルト: 100） */
  maxMp?: number;
  /** 初期MP（デフォルト: maxMp） */
  initialMp?: number;
  /** MPの自動回復量（1秒あたり、デフォルト: 10） */
  mpRegenRate?: number;
  /** 弾一発のMP消費量（デフォルト: 15） */
  mpCostPerShot?: number;
}

/**
 * プレイヤーステータス管理クラス
 * HP/MPの状態を管理し、イベント経由で変更を通知する
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.playerStats = new PlayerStats(this, { maxHp: 100, maxMp: 100 });
 * 
 * // イベントリスナー登録
 * this.playerStats.on('hpChange', (hp, maxHp) => { ... });
 * this.playerStats.on('mpChange', (mp, maxMp) => { ... });
 * this.playerStats.on('death', () => { ... });
 * 
 * // update()でMP自動回復を更新
 * this.playerStats.update(delta);
 * 
 * // 射撃時にMP消費をチェック
 * if (this.playerStats.canShoot()) {
 *   this.playerStats.consumeMpForShot();
 *   // 弾を発射...
 * }
 * ```
 */
export class PlayerStats extends Phaser.Events.EventEmitter {
  // HP関連
  private hp: number;
  private maxHp: number;

  // MP関連
  private mp: number;
  private maxMp: number;
  private mpRegenRate: number;
  private mpCostPerShot: number;

  /**
   * @param _scene 所属するシーン（将来の拡張用）
   * @param config 設定オプション
   */
  constructor(_scene: Phaser.Scene, config: PlayerStatsConfig = {}) {
    super();

    // HP初期化
    this.maxHp = config.maxHp ?? 100;
    this.hp = config.initialHp ?? this.maxHp;

    // MP初期化
    this.maxMp = config.maxMp ?? 100;
    this.mp = config.initialMp ?? this.maxMp;
    this.mpRegenRate = config.mpRegenRate ?? 10;
    this.mpCostPerShot = config.mpCostPerShot ?? 15;
  }

  /**
   * 更新処理（MP自動回復）
   * @param delta デルタタイム（ミリ秒）
   */
  update(delta: number): void {
    // MP自動回復
    if (this.mp < this.maxMp) {
      const regenAmount = (this.mpRegenRate * delta) / 1000;
      this.setMp(Math.min(this.mp + regenAmount, this.maxMp));
    }
  }

  // === HP関連メソッド ===

  /**
   * 現在のHPを取得
   */
  getHp(): number {
    return this.hp;
  }

  /**
   * 最大HPを取得
   */
  getMaxHp(): number {
    return this.maxHp;
  }

  /**
   * HPを設定
   * @param value 新しいHP値
   */
  setHp(value: number): void {
    const oldHp = this.hp;
    this.hp = Phaser.Math.Clamp(value, 0, this.maxHp);

    if (this.hp !== oldHp) {
      this.emit('hpChange', this.hp, this.maxHp);

      if (this.hp <= 0) {
        this.emit('death');
      }
    }
  }

  /**
   * ダメージを受ける
   * @param amount ダメージ量
   */
  takeDamage(amount: number): void {
    this.setHp(this.hp - amount);
  }

  /**
   * HPを回復する
   * @param amount 回復量
   */
  heal(amount: number): void {
    this.setHp(this.hp + amount);
  }

  /**
   * HPをパーセンテージで取得（0-1）
   */
  getHpPercent(): number {
    return this.hp / this.maxHp;
  }

  /**
   * 生存しているか
   */
  isAlive(): boolean {
    return this.hp > 0;
  }

  // === MP関連メソッド ===

  /**
   * 現在のMPを取得
   */
  getMp(): number {
    return this.mp;
  }

  /**
   * 最大MPを取得
   */
  getMaxMp(): number {
    return this.maxMp;
  }

  /**
   * MPを設定
   * @param value 新しいMP値
   */
  setMp(value: number): void {
    const oldMp = this.mp;
    this.mp = Phaser.Math.Clamp(value, 0, this.maxMp);

    if (this.mp !== oldMp) {
      this.emit('mpChange', this.mp, this.maxMp);
    }
  }

  /**
   * MPを消費する
   * @param amount 消費量
   * @returns 消費できたかどうか
   */
  consumeMp(amount: number): boolean {
    if (this.mp >= amount) {
      this.setMp(this.mp - amount);
      return true;
    }
    return false;
  }

  /**
   * 射撃可能かどうか（MP足りているか）
   */
  canShoot(): boolean {
    return this.mp >= this.mpCostPerShot;
  }

  /**
   * 射撃のためのMPを消費
   * @returns 消費できたかどうか
   */
  consumeMpForShot(): boolean {
    return this.consumeMp(this.mpCostPerShot);
  }

  /**
   * 弾一発のMP消費量を取得
   */
  getMpCostPerShot(): number {
    return this.mpCostPerShot;
  }

  /**
   * 弾一発のMP消費量を設定
   */
  setMpCostPerShot(cost: number): void {
    this.mpCostPerShot = cost;
  }

  /**
   * MPをパーセンテージで取得（0-1）
   */
  getMpPercent(): number {
    return this.mp / this.maxMp;
  }

  /**
   * MPを回復する
   * @param amount 回復量
   */
  restoreMp(amount: number): void {
    this.setMp(this.mp + amount);
  }

  // === ユーティリティメソッド ===

  /**
   * 全ステータスをリセット
   */
  reset(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.emit('hpChange', this.hp, this.maxHp);
    this.emit('mpChange', this.mp, this.maxMp);
  }

  /**
   * 破棄
   */
  destroy(): void {
    this.removeAllListeners();
  }
}
