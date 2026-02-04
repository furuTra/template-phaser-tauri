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
プレイヤー/敵が使用する武器・攻撃手段の型定義（`src/types/Weapon/`）：

**基本情報（BaseWeapon）**
- `id`: 武器ID
- `name`: 武器名
- `description`: 説明
- `attackPower`: 攻撃力
- `mpCost`: 消費MP
- `cooldown`: 攻撃間隔（ミリ秒）

**遠距離武器（RangedWeapon extends BaseWeapon）**
- `maxAmmo`: 制限弾数（null = 無限弾）
- `currentAmmo`: 現在の残弾数
- `velocity`: 弾速設定（VelocityConfig）
- `trajectory`: 軌道設定（TrajectoryConfig）
- `effects`: 特殊効果配列（EffectConfig[]）
- `range`: 射程距離
- `simultaneousShots`: 同時発射数
- `angleOffset`: 発射角度オフセット（度数）
- `bulletWidth`, `bulletHeight`, `bulletColor`: 弾の見た目

**弾速設定（VelocityConfig）**
- `type`: 弾速タイプ（`'constant' | 'accelerate' | 'decelerate'`）
- `initialSpeed`: 初速
- `acceleration?`: 加速度（加速・減速型のみ）

**弾軌道設定（TrajectoryConfig）**
- `type`: 軌道タイプ（`'straight' | 'homing' | 'arc' | 'wave' | 'spiral'`）
- `homingStrength?`: 追尾強度（追尾型のみ、0-1）
- `arcHeight?`: 放物線高さ（放物線型のみ）
- その他軌道タイプ固有オプション

**特殊効果設定（EffectConfig）**
- `type`: 効果タイプ（`'explosion' | 'pierce' | 'spread' | 'bounce' | 'split'`）
- 各効果タイプ固有のパラメータ

### 弾（Bullet）
弾の実装（`src/components/gameplay/`）：

**弾の種類ID（BulletTypeId）**
```typescript
type BulletTypeId = 'single' | 'triple' | 'spread' | 'rapid' | 'heavy';
```

| ID | 特性 |
|----|------|
| `single` | 標準弾（16x8, 黄色, 速度500, ダメージ10） |
| `triple` | 3方向発射パターン用（16x8, マゼンタ） |
| `spread` | 拡散発射パターン用（14x7, 青, やや小さく短射程） |
| `rapid` | 連射用（12x6, シアン, 速度700, ダメージ5） |
| `heavy` | 重弾（24x12, オレンジ, 速度350, ダメージ25） |

**弾の設定（BulletConfig）**
- `speed?`: 弾の速度（デフォルト: 500）
- `lifespan?`: 弾の寿命（ミリ秒、デフォルト: 2000）
- `damage?`: ダメージ量（デフォルト: 10）

**BulletGameObject型**
Bulletで使用可能なGameObject型：
```typescript
type BulletGameObject = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  setPosition(x: number, y: number): unknown;
  setRotation(radians: number): unknown;
  setActive(value: boolean): unknown;
  setVisible(value: boolean): unknown;
};
```
Rectangle, Arc, Sprite等が使用可能。

**GameObjectFactory型**
弾の形状を生成するファクトリ関数：
```typescript
type GameObjectFactory = (scene: Phaser.Scene, x: number, y: number) => BulletGameObject;
```

**弾種定義（BulletTypeDefinition）**
弾の種類定義には以下を含む：
- `id`: 種類ID
- `name`: 表示名
- `description`: 説明
- `shotCount`: 同時発射数
- `spreadAngle?`: 拡散角度（度数）
- `bulletConfig`: 弾の設定
- `gameObjectFactory`: GameObject生成関数

**弾の実装構造**
```
Bullet（基底クラス、外部GameObjectをラップ）
└── 物理ボディの管理
└── ライフサイクル管理

BulletTypes.BULLET_TYPES[typeId].gameObjectFactory
└── 各弾種の形状を定義（Rectangle, Arc等）
```

### 弾プール（BulletPool）
弾種ごとのサブプールによる弾の再利用管理（`src/components/gameplay/BulletPool.ts`）：

**アーキテクチャ**
- **マルチサブプール方式**: 弾種ごとに独立したサブプール（SubPool）を保持
- **遅延初期化**: 発射時に初めてサブプールを作成（未使用の弾種はインスタンス化されない）
- **LRU削除**: サブプール数が上限（デフォルト3）を超えると、最も古く使われたものを削除

**設定（BulletPoolConfig）**
- `subPoolConfigs?`: 弾種ごとのサブプール設定
- `defaultMaxBulletsPerType?`: 弾種ごとの最大弾数（デフォルト: 20）
- `maxSubPools?`: 同時に保持するサブプールの最大数（デフォルト: 3）

**サブプール設定（SubPoolConfig）**
- `maxBullets?`: この弾種のプール内最大弾数（デフォルト: 20）

**コールバック**
- `setOnSubPoolCreated()`: サブプール作成時（衝突判定の動的設定用）
- `setOnSubPoolDestroyed()`: サブプール削除時（衝突判定の解除用）

**主要メソッド**
- `fire()`: 単発発射
- `fireTriple()`: 3方向発射
- `fireSpread()`: 拡散発射
- `fireByType()`: 種類ID指定で発射
- `fireWithWeapon()`: 武器設定で発射
- `getActiveBullets()`: アクティブな弾を全取得

### 弾発射ファクトリ（BulletFireFactory）
発射ロジックの一元管理（`src/components/gameplay/bullets/BulletFireFactory.ts`）：

**静的メソッド**
- `fireSingle()`: 単発発射
- `fireTriple()`: 3方向発射
- `fireSpread()`: 拡散発射（発射数と角度指定可能）
- `fireWithWeapon()`: 武器の同時発射数と角度オフセットを適用
- `fireByType()`: BulletTypeIdに基づく発射

## 型定義の実装場所

### src/types/ ディレクトリ構成（型定義のみ）
```
src/types/
├── Character/
│   ├── BaseCharacter.ts      # キャラクター基底インターフェース
│   ├── Player.ts             # プレイヤー型
│   ├── Enemy.ts              # 敵型
│   └── CharacterTypes.ts     # 列挙型・定数
├── Weapon/
│   ├── BaseWeapon.ts         # 武器基底インターフェース
│   ├── RangedWeapon.ts       # 遠距離武器型
│   ├── Projectile.ts         # 弾丸型（レガシー、参考用）
│   └── WeaponTypes.ts        # 列挙型・定数
├── SaveData.ts               # セーブデータ型
├── GameFlags.ts              # ゲームフラグ型
└── index.ts                  # 再エクスポート
```

### src/components/gameplay/bullets/ ディレクトリ構成（弾関連実装）
```
src/components/gameplay/bullets/
├── index.ts              # 再エクスポート
├── Bullet.ts             # 弾クラス・BulletConfig・BulletGameObject型
├── BulletTypes.ts        # BulletTypeId・BulletTypeDefinition・GameObjectFactory
├── BulletPool.ts         # マルチサブプール・LRU管理
└── BulletFireFactory.ts  # 発射ロジック
```

### src/components/gameplay/ ディレクトリ構成（実装）
```
src/components/gameplay/
├── bullets/                  # 弾関連（別途記載）
├── ShootingController.ts     # 射撃コントローラー
└── ...
```

## 継承構造の原則

### キャラクター系（型定義）
```
BaseCharacter（共通プロパティ）
  ├─ Player（プレイヤー固有プロパティ）
  └─ Enemy（敵固有プロパティ）
```

### 武器系（型定義）
```
BaseWeapon（共通プロパティ）
  ├─ MeleeWeapon（近接武器）
  └─ RangedWeapon（遠距離武器）
```

### 弾系（実装クラス）
```
Bullet（弾管理クラス）
└── 外部から渡されたBulletGameObjectをラップ
└── 物理ボディ(Arcade)の管理
└── ライフサイクル（activate/deactivate）

BulletTypes.BULLET_TYPES
└── 各弾種のgameObjectFactory（形状定義）
└── 各弾種のbulletConfig（速度・ダメージ等）

BulletPool
├── SubPool（single用）
├── SubPool（triple用）
└── ...（最大3個、LRU削除）
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
  maxAmmo: number | null;
  currentAmmo: number | null;
  velocity: VelocityConfig;
  trajectory: TrajectoryConfig;
  effects: EffectConfig[];
  range: number;
  simultaneousShots: number;
  angleOffset: number;
  bulletWidth: number;
  bulletHeight: number;
  bulletColor: number;
}
```

### 弾種定義の追加例
```typescript
// src/components/gameplay/BulletTypes.ts
// 新しい弾種を追加する場合

// 1. BulletTypeIdにIDを追加
export type BulletTypeId = 'single' | 'triple' | 'spread' | 'rapid' | 'heavy' | 'laser';

// 2. BULLET_TYPESに定義を追加
export const BULLET_TYPES: Record<BulletTypeId, BulletTypeDefinition> = {
  // ... 既存の定義
  laser: {
    id: 'laser',
    name: 'レーザー',
    description: '高速貫通レーザー',
    shotCount: 1,
    bulletConfig: {
      speed: 1000,
      lifespan: 1000,
      damage: 15,
    },
    // gameObjectFactoryで形状を定義（Rectangle, Arc, Sprite等）
    gameObjectFactory: (scene, x, y) => scene.add.rectangle(x, y, 30, 4, 0xff0000),
  },
};
```

### 弾プール使用例
```typescript
// シーンでの使用
export class PlayScene extends Phaser.Scene {
  private bulletPool!: BulletPool;
  private bulletColliders: Map<BulletTypeId, Phaser.Physics.Arcade.Collider[]> = new Map();

  create(): void {
    // 弾プールを作成（遅延初期化方式）
    this.bulletPool = new BulletPool(this, {
      maxSubPools: 3,  // 同時に保持するサブプール数（LRU削除）
      defaultMaxBulletsPerType: 20,  // 各弾種の最大弾数
    });

    // サブプール作成時に衝突判定を設定
    this.bulletPool.setOnSubPoolCreated((typeId, bullets) => {
      const colliders: Phaser.Physics.Arcade.Collider[] = [];
      bullets.forEach(bullet => {
        const collider = this.physics.add.collider(bullet.gameObject, this.enemies, ...);
        colliders.push(collider);
      });
      this.bulletColliders.set(typeId, colliders);
    });

    // サブプール削除時に衝突判定を解除
    this.bulletPool.setOnSubPoolDestroyed((typeId) => {
      const colliders = this.bulletColliders.get(typeId);
      colliders?.forEach(c => c.destroy());
      this.bulletColliders.delete(typeId);
    });
  }

  update(time: number, delta: number): void {
    this.bulletPool.updateBullets(time, delta);
  }

  // 発射例
  fireBullet(fromX: number, fromY: number, targetX: number, targetY: number): void {
    // 単発発射（'single'サブプールを遅延作成）
    this.bulletPool.fire(fromX, fromY, targetX, targetY);
    
    // 種類指定で発射（指定のサブプールを遅延作成）
    this.bulletPool.fireByType('triple', fromX, fromY, targetX, targetY);
    
    // 武器設定で発射
    this.bulletPool.fireWithWeapon(fromX, fromY, targetX, targetY, weapon);
  }
}
```

### 使用例（Phaserシーン）
```typescript
// src/scenes/internal/BattleScene.ts
import type { Player, Enemy } from '@/types';
import { BulletPool } from '@/components/gameplay/bullets';
import { ShootingController } from '@/components/gameplay/ShootingController';

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private shootingController!: ShootingController;
}
```