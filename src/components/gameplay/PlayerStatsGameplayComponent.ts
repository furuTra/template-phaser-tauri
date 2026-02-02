import Phaser from 'phaser';

// types
import type { PlayerStatsConfig } from '@/types/Character/Player';
import type { RangedWeapon } from '@/types/Weapon/RangedWeapon';

// events
import {
  PLAYER_EVENTS,
  type PlayerHpChangedData,
  type PlayerMpChangedData,
  type PlayerStatsChangedData,
  type PlayerExpChangedData,
  type PlayerLevelUpData,
  type PlayerWeaponChangedData,
} from '@/events';

// PlayableSceneの型（循環参照回避）
interface PlayableSceneLike {
  getPlayableSceneEvents(): Phaser.Events.EventEmitter;
}

// 型定義を再エクスポート（後方互換性のため）
export type { PlayerStatsConfig } from '@/types/Character/Player';

/**
 * プレイヤーステータス管理コンポーネント
 * HP/MP/攻撃力/防御力などの状態を管理し、sceneEvents経由で変更を通知する
 * 
 * game-object.md の Player 仕様に準拠
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.playerStats = new PlayerStatsGameplayComponent(this, { maxHp: 100, maxMp: 100 });
 * 
 * // イベントリスナー登録（sceneEvents経由）
 * this.sceneEvents.on(PLAYER_EVENTS.HP_CHANGED, (data) => { ... });
 * this.sceneEvents.on(PLAYER_EVENTS.MP_CHANGED, (data) => { ... });
 * this.sceneEvents.on(PLAYER_EVENTS.DEATH, () => { ... });
 * this.sceneEvents.on(PLAYER_EVENTS.LEVEL_UP, (data) => { ... });
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
export class PlayerStatsGameplayComponent {
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

  // === イベント ===
  /** PlayableSceneスコープのイベントエミッター（オプショナル） */
  private sceneEvents?: Phaser.Events.EventEmitter;

  /**
   * @param scene 所属するシーン
   * @param config 設定オプション
   */
  constructor(scene: Phaser.Scene, config: PlayerStatsConfig = {}) {
    // PlayableSceneの場合、sceneEventsを取得
    if ('getPlayableSceneEvents' in scene) {
      this.sceneEvents = (scene as PlayableSceneLike).getPlayableSceneEvents();
    }

    // HP初期化
    this.maxHp = config.maxHp ?? 100;
    this.hp = config.initialHp ?? this.maxHp;

    // MP初期化
    this.maxMp = config.maxMp ?? 100;
    this.mp = config.initialMp ?? this.maxMp;
    this.mpRegenRate = config.mpRegenRate ?? 60;
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
      // sceneEventsへ発火
      if (this.sceneEvents) {
        const data: PlayerHpChangedData = { hp: this.hp, maxHp: this.maxHp };
        this.sceneEvents.emit(PLAYER_EVENTS.HP_CHANGED, data);
      }

      if (this.hp <= 0) {
        this.sceneEvents?.emit(PLAYER_EVENTS.DEATH);
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
      // sceneEventsへ発火
      if (this.sceneEvents) {
        const data: PlayerMpChangedData = { mp: this.mp, maxMp: this.maxMp };
        this.sceneEvents.emit(PLAYER_EVENTS.MP_CHANGED, data);
      }
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
   * 指定したコストで射撃可能かどうか
   * @param cost MP消費量
   */
  canShootWithCost(cost: number): boolean {
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
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerStatsChangedData = { statName: 'attack', value: this.attack };
      this.sceneEvents.emit(PLAYER_EVENTS.STATS_CHANGED, data);
    }
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
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerStatsChangedData = { statName: 'defense', value: this.defense };
      this.sceneEvents.emit(PLAYER_EVENTS.STATS_CHANGED, data);
    }
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
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerStatsChangedData = { statName: 'speed', value: this.speed };
      this.sceneEvents.emit(PLAYER_EVENTS.STATS_CHANGED, data);
    }
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
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerExpChangedData = { exp: this.exp };
      this.sceneEvents.emit(PLAYER_EVENTS.EXP_CHANGED, data);
    }
    
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

    // sceneEventsへ発火
    if (this.sceneEvents) {
      const levelData: PlayerLevelUpData = { level: this.level };
      this.sceneEvents.emit(PLAYER_EVENTS.LEVEL_UP, levelData);

      const hpData: PlayerHpChangedData = { hp: this.hp, maxHp: this.maxHp };
      this.sceneEvents.emit(PLAYER_EVENTS.HP_CHANGED, hpData);

      const mpData: PlayerMpChangedData = { mp: this.mp, maxMp: this.maxMp };
      this.sceneEvents.emit(PLAYER_EVENTS.MP_CHANGED, mpData);
    }
  }

  // === ユーティリティメソッド ===

  /**
   * 全ステータスをリセット
   */
  reset(): void {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const hpData: PlayerHpChangedData = { hp: this.hp, maxHp: this.maxHp };
      this.sceneEvents.emit(PLAYER_EVENTS.HP_CHANGED, hpData);

      const mpData: PlayerMpChangedData = { mp: this.mp, maxMp: this.maxMp };
      this.sceneEvents.emit(PLAYER_EVENTS.MP_CHANGED, mpData);
    }
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
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerWeaponChangedData = { weaponId: weapon.id };
      this.sceneEvents.emit(PLAYER_EVENTS.WEAPON_CHANGED, data);
    }
  }

  /**
   * 武器を外す
   */
  unequipWeapon(): void {
    this.equippedWeapon = null;
    // sceneEventsへ発火
    if (this.sceneEvents) {
      const data: PlayerWeaponChangedData = { weaponId: null };
      this.sceneEvents.emit(PLAYER_EVENTS.WEAPON_CHANGED, data);
    }
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
    // sceneEventsのremoveAllListenersはPlayableScene側で行う
  }
}
