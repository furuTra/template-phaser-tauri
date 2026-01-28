import Phaser from 'phaser';

// types
import type { PlayerStatsConfig } from '@/types/Character/Player';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

// 型定義を再エクスポート（後方互換性のため）
export type { PlayerStatsConfig } from '@/types/Character/Player';

/**
 * プレイヤーステータス管理コンポーネント
 * HP/MP/攻撃力/防御力などの状態を管理し、イベント経由で変更を通知する
 * 
 * game-object.md の Player 仕様に準拠
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.playerStats = new PlayerStatsGameplayComponent(this, { maxHp: 100, maxMp: 100 });
 * 
 * // イベントリスナー登録
 * this.playerStats.on('hpChange', (hp, maxHp) => { ... });
 * this.playerStats.on('mpChange', (mp, maxMp) => { ... });
 * this.playerStats.on('death', () => { ... });
 * this.playerStats.on('levelUp', (newLevel) => { ... });
 * 
 * // update()でMP自動回復を更新
 * this.playerStats.update(delta);
 * 
 * // 射撃時にMP消費をチェック
 * if (this.playerStats.canShoot()) {
 *   this.playerStats.consumeMpForShot();
 *   // 弾を発射...
 * }
 * 
 * // ダメージ計算
 * const damage = this.playerStats.calculateDamage(enemyDefense);
 * ```
 */
export class PlayerStatsGameplayComponent extends Phaser.Events.EventEmitter {
  // === HP関連 ===
  private hp: number;
  private maxHp: number;

  // === MP関連 ===
  private mp: number;
  private maxMp: number;
  private mpRegenRate: number;
  private mpCostPerShot: number;

  // === 戦闘ステータス ===
  private attack: number;
  private defense: number;
  private speed: number;

  // === 成長ステータス ===
  private level: number;
  private exp: number;

  // === 武器関連 ===
  private equippedWeapon: RangedWeapon | null = null;

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

    // 戦闘ステータス初期化
    this.attack = config.attack ?? 10;
    this.defense = config.defense ?? 5;
    this.speed = config.speed ?? 200;

    // 成長ステータス初期化
    this.level = config.level ?? 1;
    this.exp = config.exp ?? 0;
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
   * ダメージを受ける（防御力を考慮）
   * @param rawDamage 素のダメージ量
   * @returns 実際に受けたダメージ量
   */
  takeDamage(rawDamage: number): number {
    const actualDamage = Math.max(1, rawDamage - this.defense);
    this.setHp(this.hp - actualDamage);
    return actualDamage;
  }

  /**
   * 直接ダメージを受ける（防御力を無視）
   * @param amount ダメージ量
   */
  takeDirectDamage(amount: number): void {
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
   * 武器が装備されている場合は武器のmpCostを使用
   */
  canShoot(): boolean {
    const cost = this.getEffectiveMpCost();
    return this.mp >= cost;
  }

  /**
   * 射撃のためのMPを消費
   * 武器が装備されている場合は武器のmpCostを使用
   * @returns 消費できたかどうか
   */
  consumeMpForShot(): boolean {
    const cost = this.getEffectiveMpCost();
    return this.consumeMp(cost);
  }

  /**
   * 実効MP消費量を取得（武器優先）
   */
  private getEffectiveMpCost(): number {
    return this.equippedWeapon?.mpCost ?? this.mpCostPerShot;
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

  // === 戦闘ステータス関連メソッド ===

  /**
   * 攻撃力を取得
   */
  getAttack(): number {
    return this.attack;
  }

  /**
   * 攻撃力を設定
   */
  setAttack(value: number): void {
    this.attack = Math.max(0, value);
    this.emit('statsChange', 'attack', this.attack);
  }

  /**
   * 防御力を取得
   */
  getDefense(): number {
    return this.defense;
  }

  /**
   * 防御力を設定
   */
  setDefense(value: number): void {
    this.defense = Math.max(0, value);
    this.emit('statsChange', 'defense', this.defense);
  }

  /**
   * 移動速度を取得
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * 移動速度を設定
   */
  setSpeed(value: number): void {
    this.speed = Math.max(0, value);
    this.emit('statsChange', 'speed', this.speed);
  }

  /**
   * ダメージ計算（攻撃力 - 敵の防御力）
   * @param enemyDefense 敵の防御力
   * @returns 与えるダメージ量（最低1）
   */
  calculateDamage(enemyDefense: number): number {
    return Math.max(1, this.attack - enemyDefense);
  }

  // === 成長ステータス関連メソッド ===

  /**
   * 現在のレベルを取得
   */
  getLevel(): number {
    return this.level;
  }

  /**
   * 現在の経験値を取得
   */
  getExp(): number {
    return this.exp;
  }

  /**
   * 経験値を追加
   * @param amount 追加する経験値
   */
  addExp(amount: number): void {
    this.exp += amount;
    this.emit('expChange', this.exp);
    
    // レベルアップチェック（簡易的な計算: 100 * level で次のレベル）
    const expForNextLevel = this.level * 100;
    if (this.exp >= expForNextLevel) {
      this.levelUp();
    }
  }

  /**
   * レベルアップ処理
   */
  private levelUp(): void {
    this.level++;
    this.exp = 0;

    // ステータス上昇
    this.maxHp += 10;
    this.maxMp += 5;
    this.attack += 2;
    this.defense += 1;

    // HP/MPを全回復
    this.hp = this.maxHp;
    this.mp = this.maxMp;

    this.emit('levelUp', this.level);
    this.emit('hpChange', this.hp, this.maxHp);
    this.emit('mpChange', this.mp, this.maxMp);
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
   * 全ステータスを取得
   */
  getAllStats(): {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
    exp: number;
  } {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      mp: this.mp,
      maxMp: this.maxMp,
      attack: this.attack,
      defense: this.defense,
      speed: this.speed,
      level: this.level,
      exp: this.exp,
    };
  }

  // === 武器関連メソッド ===

  /**
   * 武器を装備
   * @param weapon 装備する武器
   */
  equipWeapon(weapon: RangedWeapon): void {
    this.equippedWeapon = weapon;
    this.emit('weaponChange', weapon);
  }

  /**
   * 武器を外す
   */
  unequipWeapon(): void {
    this.equippedWeapon = null;
    this.emit('weaponChange', null);
  }

  /**
   * 装備中の武器を取得
   */
  getEquippedWeapon(): RangedWeapon | null {
    return this.equippedWeapon;
  }

  /**
   * 装備中の武器IDを取得
   */
  getEquippedWeaponId(): string | null {
    return this.equippedWeapon?.id ?? null;
  }

  /**
   * 武器が装備されているか
   */
  hasWeaponEquipped(): boolean {
    return this.equippedWeapon !== null;
  }

  /**
   * 現在の攻撃力を取得（武器ボーナス込み）
   */
  getTotalAttack(): number {
    const weaponPower = this.equippedWeapon?.attackPower ?? 0;
    return this.attack + weaponPower;
  }

  /**
   * 現在の攻撃間隔を取得（武器から、なければデフォルト）
   */
  getFireRate(): number {
    return this.equippedWeapon?.cooldown ?? 100;
  }

  /**
   * 破棄
   */
  destroy(): void {
    this.removeAllListeners();
  }
}

// 後方互換性のためのエイリアス
export { PlayerStatsGameplayComponent as PlayerStats };
