/**
 * イベント名定数とデータ型定義
 *
 * PlayableSceneスコープのイベント管理で使用
 * イベント名は文字列リテラルで直接書かず、この定数を使用する
 */

// ============================================================
// プレイヤー関連イベント
// ============================================================

/**
 * プレイヤー関連イベント定数
 */
export const PLAYER_EVENTS = {
  /** HP変化時 */
  HP_CHANGED: 'player:hp-changed',
  /** MP変化時 */
  MP_CHANGED: 'player:mp-changed',
  /** ステータス変化時（attack/defense/speed） */
  STATS_CHANGED: 'player:stats-changed',
  /** 経験値変化時 */
  EXP_CHANGED: 'player:exp-changed',
  /** レベルアップ時 */
  LEVEL_UP: 'player:level-up',
  /** 死亡時 */
  DEATH: 'player:death',
  /** 武器変更時 */
  WEAPON_CHANGED: 'player:weapon-changed',
} as const;

/**
 * PLAYER_EVENTSの値の型
 */
export type PlayerEventType = (typeof PLAYER_EVENTS)[keyof typeof PLAYER_EVENTS];

// ============================================================
// イベントデータ型定義
// ============================================================

/**
 * HP変化イベントデータ
 */
export interface PlayerHpChangedData {
  hp: number;
  maxHp: number;
}

/**
 * MP変化イベントデータ
 */
export interface PlayerMpChangedData {
  mp: number;
  maxMp: number;
}

/**
 * ステータス変化イベントデータ
 */
export interface PlayerStatsChangedData {
  statName: 'attack' | 'defense' | 'speed';
  value: number;
}

/**
 * 経験値変化イベントデータ
 */
export interface PlayerExpChangedData {
  exp: number;
}

/**
 * レベルアップイベントデータ
 */
export interface PlayerLevelUpData {
  level: number;
}

/**
 * 武器変更イベントデータ
 */
export interface PlayerWeaponChangedData {
  weaponId: string | null;
}
