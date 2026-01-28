/**
 * プレイヤーステータスの設定
 * game-object.md の Player 仕様に準拠
 */
export interface PlayerStatsConfig {
  // === 基本ステータス ===
  /** 最大HP（デフォルト: 100） */
  maxHp?: number;
  /** 初期HP（デフォルト: maxHp） */
  initialHp?: number;
  /** 最大MP（デフォルト: 100） */
  maxMp?: number;
  /** 初期MP（デフォルト: maxMp） */
  initialMp?: number;

  // === 戦闘ステータス ===
  /** 攻撃力（デフォルト: 10） */
  attack?: number;
  /** 防御力（デフォルト: 5） */
  defense?: number;
  /** 移動速度（デフォルト: 200） */
  speed?: number;

  // === 成長ステータス ===
  /** 初期レベル（デフォルト: 1） */
  level?: number;
  /** 初期経験値（デフォルト: 0） */
  exp?: number;

  // === MP回復設定 ===
  /** MPの自動回復量（1秒あたり、デフォルト: 10） */
  mpRegenRate?: number;
  /** 弾一発のMP消費量（デフォルト: 15） */
  mpCostPerShot?: number;
}

/**
 * プレイヤーの装備・進行状態
 */
export interface PlayerProgressState {
  /** 装備中の武器ID（null = 未装備） */
  equippedWeaponId: string | null;
  /** 習得済みスキルIDリスト */
  skills: string[];
  /** 現在のステージID */
  currentStageId: string;
}

/**
 * プレイヤーの完全な状態（将来の拡張用）
 */
export interface PlayerState {
  // 基本情報
  id: string;
  name: string;

  // ステータス
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;

  // 成長
  level: number;
  exp: number;

  // 装備・進行
  equippedWeaponId: string | null;
  skills: string[];
  currentStageId: string;

  // 座標
  x: number;
  y: number;
}

/**
 * デフォルトのプレイヤーステータス設定を生成
 */
export function createDefaultPlayerStatsConfig(): Required<PlayerStatsConfig> {
  return {
    maxHp: 100,
    initialHp: 100,
    maxMp: 100,
    initialMp: 100,
    attack: 10,
    defense: 5,
    speed: 200,
    level: 1,
    exp: 0,
    mpRegenRate: 10,
    mpCostPerShot: 15,
  };
}

/**
 * デフォルトのプレイヤー状態を生成
 */
export function createDefaultPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    attack: 10,
    defense: 5,
    speed: 200,
    level: 1,
    exp: 0,
    equippedWeaponId: null,
    skills: [],
    currentStageId: 'stage_1',
    x: 0,
    y: 0,
  };
}
