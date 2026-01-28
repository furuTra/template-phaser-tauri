# ゲームオブジェクト設計書

プロジェクトで使用するゲームオブジェクトの仕様を定義します。

## オブジェクトの種類と必須プロパティ

### プレイヤー (Player)
プレイヤーキャラクターが持つべきプロパティ：

**基本情報**
- `id`: プレイヤー一意ID
- `name`: プレイヤー名

**ステータス**
- `hp`: 現在HP
- `maxHp`: 最大HP
- `mp`: 現在MP
- `maxMp`: 最大MP
- `level`: 現在レベル
- `exp`: 現在経験値
- `attack`: 攻撃力
- `defense`: 防御力
- `speed`: 移動速度

**装備・進行**
- `equippedWeaponId`: 装備中の武器ID
- `skills`: 習得済みスキルIDリスト
- `currentStageId`: 現在のステージID

**座標**
- `x`, `y`: 現在位置

### 敵 (Enemy)
敵キャラクターが持つべきプロパティ：

**基本情報**
- `id`: 敵インスタンスID
- `typeId`: 敵種別ID（enemy_goblin等）
- `name`: 敵の名前

**ステータス**
- `hp`: 現在HP
- `maxHp`: 最大HP
- `attack`: 攻撃力（衝突時ダメージ）
- `defense`: 防御力
- `speed`: 移動速度

**報酬**
- `expReward`: 撃破時獲得経験値
- `goldReward`: 撃破時獲得ゴールド

**行動パターン**
- `behaviorType`: 基本行動（patrol, chase, ranged, stationary）
- `attackType`: 攻撃タイプ（melee, projectile, area）
- `attackRange`: 攻撃範囲
- `detectionRange`: 索敵範囲

**状態**
- `targetId`: 現在のターゲットID
- `patrolPoints`: 巡回ルート（巡回型のみ）

**座標**
- `x`, `y`: 現在位置

### 武器 (Weapon)
プレイヤー/敵が使用する武器・攻撃手段が持つべきプロパティ：

**基本情報**
- `id`: 武器ID
- `name`: 武器名
- `description`: 説明

**性能**
- `attackPower`: 攻撃力
- `mpCost`: 消費MP
- `cooldown`: 攻撃間隔（ミリ秒）
- `maxAmmo`: 制限弾数（null = 無限弾）
- `currentAmmo`: 現在の残弾数

**弾速設定**
- `velocity.type`: 弾速タイプ（constant, accelerate, decelerate）
- `velocity.initialSpeed`: 初速
- `velocity.acceleration`: 加速度（加速・減速型のみ）

**弾軌道設定**
- `trajectory.type`: 軌道タイプ（straight, homing, arc, wave, spiral）
- `trajectory.homingStrength`: 追尾強度（追尾型のみ）
- `trajectory.arcHeight`: 放物線高さ（放物線型のみ）

**特殊性能**
- `effects`: 特殊効果配列（explosion, pierce, spread, bounce, split）
- `range`: 射程距離
- `simultaneousShots`: 同時発射数
- `angleOffset`: 発射角度オフセット

### 弾丸 (Projectile)
発射された弾丸インスタンスが持つべきプロパティ：

**基本情報**
- `id`: 弾丸インスタンスID
- `ownerId`: 発射元ID
- `weaponId`: 使用武器ID
- `damage`: ダメージ量

**位置・速度**
- `x`, `y`: 現在位置
- `velocityX`, `velocityY`: 速度ベクトル
- `rotation`: 回転角度

**設定（武器から継承）**
- `velocity`: 弾速設定
- `trajectory`: 軌道設定
- `effects`: 特殊効果配列
- `maxRange`: 最大射程

**状態**
- `isActive`: 有効フラグ
- `traveledDistance`: 移動距離
- `targetId`: 追尾中のターゲットID（追尾型のみ）
- `pierceCount`: 貫通済み数
- `bounceCount`: 反射済み数

## 型定義の実装場所

### src/types/ ディレクトリ構成
```
src/types/
├── Character/
│   ├── BaseCharacter.ts      # キャラクター基底
│   ├── Player.ts             # プレイヤー
│   ├── Enemy.ts              # 敵
│   └── CharacterTypes.ts     # 列挙型
├── Weapon/
│   ├── BaseWeapon.ts         # 武器基底
│   ├── RangedWeapon.ts       # 遠距離武器
│   ├── Projectile.ts         # 弾丸
│   └── WeaponTypes.ts        # 列挙型
├── SaveData.ts               # セーブデータ
├── GameFlags.ts              # ゲームフラグ
└── index.ts                  # 再エクスポート
```

## 継承構造の原則

### キャラクター系
```
BaseCharacter（共通プロパティ）
  ├─ Player（プレイヤー固有プロパティ）
  └─ Enemy（敵固有プロパティ）
```

### 武器系
```
BaseWeapon（共通プロパティ）
  ├─ MeleeWeapon（近接武器）
  └─ RangedWeapon（遠距離武器）
```

## プロパティ命名規則

### 現在値と最大値
- 現在値: `hp`, `mp`, `exp`, `ammo`
- 最大値: `maxHp`, `maxMp`, `maxAmmo`

### ID参照
- 単数: `xxxId`（例: `weaponId`, `targetId`）
- 複数: `xxxIds`（例: `skillIds`）

### リスト
- 複数形（例: `skills`, `effects`, `patrolPoints`）

### フラグ
- `isXxx`（例: `isActive`, `isDead`）

### レート・割合
- `xxxRate`（例: `critRate`, `dodgeRate`）
- 値は 0.0～1.0

### タイプ・種別
- `xxxType`（例: `behaviorType`, `attackType`）

## readonlyの使用方針

### readonly を使う
- ID: 生成後変更されない識別子
- typeId: マスターデータ参照用ID

### readonly を使わない
- ステータス: hp, mp, exp など変化する値
- 状態: isActive, targetId など変化する状態

## オプショナルプロパティの使用方針

### `?` を使う場合
- 条件付きで存在（例: 巡回敵のみ `patrolPoints?`）
- 設定によって省略可能（例: `acceleration?`）

### `| null` を使う場合
- 明示的に「値なし」を表現（例: `targetId: string | null`）
- 無限弾の場合（例: `maxAmmo: number | null`）

## 型安全な実装

### Union型で制約
```typescript
type VelocityType = 'constant' | 'accelerate' | 'decelerate';
type BehaviorType = 'patrol' | 'chase' | 'ranged' | 'stationary';
```

### 型ガードで判定
```typescript
function isPlayer(char: BaseCharacter): char is Player {
  return 'level' in char && 'exp' in char;
}
```

## ファクトリ関数

### デフォルト値生成
型定義ファイルに例外的に配置可能：
```typescript
// src/types/Player.ts
export function createDefaultPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    level: 1,
    exp: 0,
    hp: 100,
    maxHp: 100,
    // ...デフォルト値
  };
}
```

### マスターデータからの生成
```typescript
// src/types/Enemy.ts
export function createEnemy(
  id: string,
  typeId: string,
  masterData: EnemyMasterData,
  x: number,
  y: number
): Enemy {
  return {
    id,
    typeId,
    name: masterData.name,
    hp: masterData.baseHp,
    // ...マスターデータから値を設定
    x,
    y,
  };
}
```

## 実装例

### プレイヤー型定義
```typescript
// src/types/Character/Player.ts
export interface Player extends BaseCharacter {
  level: number;
  exp: number;
  mp: number;
  maxMp: number;
  equippedWeaponId: string | null;
  skills: string[];
  currentStageId: string;
}
```

### 武器型定義
```typescript
// src/types/Weapon/RangedWeapon.ts
export interface RangedWeapon extends BaseWeapon {
  velocity: VelocityConfig;
  trajectory: TrajectoryConfig;
  range: number;
  effects: EffectConfig[];
  simultaneousShots: number;
}
```

### 使用例（Phaserシーン）
```typescript
// src/scenes/internal/BattleScene.ts
import type { Player, Enemy } from '@/types';

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
}
```