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
弾の実装はPhaserのGameObjectを継承したクラス群（`src/components/gameplay/bullets/`）：

**弾の種類ID（BulletTypeId）**
```typescript
type BulletTypeId = 'single' | 'triple' | 'spread' | 'rapid' | 'heavy';
```

| ID | クラス | 特性 |
|----|--------|------|
| `single` | SingleBullet | 標準弾（16x8, 黄色, 速度500） |
| `triple` | TripleBullet | 3方向発射パターン用 |
| `spread` | SpreadBullet | 拡散発射パターン用（やや小さく短射程） |
| `rapid` | RapidBullet | 連射用（12x6, シアン, 速度700） |
| `heavy` | HeavyBullet | 重弾（24x12, オレンジ, 速度350, 貫通対応） |

**弾の設定（BulletConfig）**
- `width?`: 弾の幅
- `height?`: 弾の高さ
- `color?`: 弾の色（16進数）
- `speed?`: 弾の速度
- `lifespan?`: 弾の寿命（ミリ秒）

**弾クラスの継承構造**
```
Bullet（基底クラス、Phaser.GameObjects.Rectangle継承）
├── SingleBullet   - 標準弾
├── TripleBullet   - 3方向用弾
├── SpreadBullet   - 拡散用弾
├── RapidBullet    - 連射用弾
└── HeavyBullet    - 重弾（貫通機能追加）
```

**発射パターン（BulletTypeDefinition）**
弾の種類定義には発射パターン情報を含む：
- `shotCount`: 同時発射数
- `spreadAngle?`: 拡散角度（度数）

### 弾プール（BulletPool）
オブジェクトプールによる弾の再利用管理（`src/components/gameplay/BulletPool.ts`）：

**設定（BulletPoolConfig）**
- `maxBullets?`: プール内の最大弾数（デフォルト: 50）
- `bulletConfig?`: 弾の設定
- `bulletType?`: 使用する弾の種類（デフォルト: `'single'`）

**主要メソッド**
- `fire()`: 単発発射
- `fireTriple()`: 3方向発射
- `fireSpread()`: 拡散発射
- `fireByType()`: 種類ID指定で発射
- `fireWithWeapon()`: 武器設定で発射

### 弾発射ファクトリ（BulletFireFactory）
発射ロジックの一元管理（`src/components/gameplay/BulletFireFactory.ts`）：

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

### src/components/gameplay/ ディレクトリ構成（実装）
```
src/components/gameplay/
├── Bullet.ts                 # 弾基底クラス・BulletConfig
├── BulletTypes.ts            # BulletTypeId・BulletTypeDefinition
├── BulletFireFactory.ts      # 発射ロジック
├── BulletPool.ts             # オブジェクトプール
├── bullets/
│   ├── index.ts              # 再エクスポート
│   ├── SingleBullet.ts       # 標準弾
│   ├── TripleBullet.ts       # 3方向弾
│   ├── SpreadBullet.ts       # 拡散弾
│   ├── RapidBullet.ts        # 連射弾
│   └── HeavyBullet.ts        # 重弾
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
Phaser.GameObjects.Rectangle
  └─ Bullet（弾基底クラス）
       ├─ SingleBullet（標準弾）
       ├─ TripleBullet（3方向弾）
       ├─ SpreadBullet（拡散弾）
       ├─ RapidBullet（連射弾）
       └─ HeavyBullet（重弾、貫通機能）
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

### 弾クラス実装
```typescript
// src/components/gameplay/bullets/HeavyBullet.ts
export class HeavyBullet extends Bullet {
  private pierceCount: number = 0;
  private maxPierceCount: number = 3;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BulletConfig = {}) {
    super(scene, x, y, { ...HEAVY_BULLET_CONFIG, ...config });
  }

  pierce(): boolean {
    this.pierceCount++;
    if (this.pierceCount >= this.maxPierceCount) {
      this.deactivate();
      return false;
    }
    return true;
  }
}
```

### 弾プール使用例
```typescript
// シーンでの使用
export class PlayScene extends Phaser.Scene {
  private bulletPool!: BulletPool;

  create(): void {
    // 弾プールを作成（弾種指定可能）
    this.bulletPool = new BulletPool(this, {
      maxBullets: 50,
      bulletType: 'single',
    });
  }

  update(time: number, delta: number): void {
    this.bulletPool.updateBullets(time, delta);
  }

  // 発射例
  fireBullet(fromX: number, fromY: number, targetX: number, targetY: number): void {
    // 単発発射
    this.bulletPool.fire(fromX, fromY, targetX, targetY);
    
    // 種類指定で発射
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
import { BulletPool } from '@/components/gameplay/BulletPool';
import { ShootingController } from '@/components/gameplay/ShootingController';

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private shootingController!: ShootingController;
}
```