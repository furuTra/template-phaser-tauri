---
applyTo: "src/events/**/*.ts"
description: グローバルEventEmitter一元管理の実装指示
---

# イベント管理ガイドライン

すべてのゲームイベントをグローバルシングルトンEventEmitterで一元管理します。

## このファイルが適用される場所
- `src/events/` 配下のすべてのTypeScriptファイル

## 基本原則

### グローバルシングルトンEventEmitter
- ゲーム全体で1つのEventEmitterを使用
- コンポーネントはEventEmitterを継承しない
- すべてのイベント発火・購読はGameEvents経由

### イベント名の定数管理
- イベント名は文字列リテラルで直接書かない
- `EventTypes.ts`で定数として一元管理

## ディレクトリ構成
```
src/events/
├── GameEvents.ts          # EventEmitterシングルトン
└── EventTypes.ts          # イベント名定数
```

## 実装パターン

### GameEvents（シングルトン）
```typescript
// src/events/GameEvents.ts
import Phaser from 'phaser';

export class GameEvents extends Phaser.Events.EventEmitter {
  private static instance: GameEvents;

  private constructor() {
    super();
  }

  static getInstance(): GameEvents {
    if (!GameEvents.instance) {
      GameEvents.instance = new GameEvents();
    }
    return GameEvents.instance;
  }
}

// エイリアス（短縮記法用）
export const gameEvents = GameEvents.getInstance();
```

### EventTypes（イベント名定数）
```typescript
// src/events/EventTypes.ts

export const PLAYER_EVENTS = {
  HP_CHANGED: 'player:hp-changed',
  MP_CHANGED: 'player:mp-changed',
  LEVEL_UP: 'player:level-up',
  DEATH: 'player:death',
} as const;

export const ENEMY_EVENTS = {
  DEFEATED: 'enemy:defeated',
  SPAWNED: 'enemy:spawned',
} as const;

export const COLLISION_EVENTS = {
  PLAYER_ENEMY: 'collision:player-enemy',
  PROJECTILE_ENEMY: 'collision:projectile-enemy',
} as const;

// イベントデータ型定義
export interface PlayerHpChangedData {
  hp: number;
  maxHp: number;
}

export interface PlayerMpChangedData {
  mp: number;
  maxMp: number;
}

export interface EnemyDefeatedData {
  enemyId: string;
  expReward: number;
}
```

## 使用例

### コンポーネント（イベント発火側）
```typescript
// src/components/gameplay/PlayerStatsGameplayComponent.ts
import { gameEvents } from '@/events/GameEvents';
import { PLAYER_EVENTS } from '@/events/EventTypes';
import type { PlayerHpChangedData } from '@/events/EventTypes';

// ❌ EventEmitterを継承しない
export class PlayerStatsGameplayComponent {
  private hp: number;
  private maxHp: number;

  constructor(scene: Phaser.Scene, config: PlayerStatsConfig) {
    this.hp = config.initialHp;
    this.maxHp = config.maxHp;
  }

  setHp(value: number): void {
    const oldHp = this.hp;
    this.hp = Phaser.Math.Clamp(value, 0, this.maxHp);

    if (this.hp !== oldHp) {
      // ✅ GameEventsシングルトン経由で発火
      const data: PlayerHpChangedData = {
        hp: this.hp,
        maxHp: this.maxHp,
      };
      gameEvents.emit(PLAYER_EVENTS.HP_CHANGED, data);

      if (this.hp <= 0) {
        gameEvents.emit(PLAYER_EVENTS.DEATH);
      }
    }
  }
}
```

### Scene（イベント購読側）
```typescript
// src/scenes/internal/GameScene.ts
import { gameEvents } from '@/events/GameEvents';
import { PLAYER_EVENTS } from '@/events/EventTypes';
import type { PlayerHpChangedData } from '@/events/EventTypes';

export class GameScene extends Phaser.Scene {
  create(): void {
    // ✅ GameEvents経由で購読
    gameEvents.on(
      PLAYER_EVENTS.HP_CHANGED,
      this.onPlayerHpChanged,
      this
    );

    gameEvents.on(
      PLAYER_EVENTS.DEATH,
      this.onPlayerDeath,
      this
    );
  }

  private onPlayerHpChanged(data: PlayerHpChangedData): void {
    this.hpBar?.setValueFromNumbers(data.hp, data.maxHp);
  }

  private onPlayerDeath(): void {
    this.scene.start('GameOverScene');
  }

  shutdown(): void {
    // リスナー解除
    gameEvents.off(PLAYER_EVENTS.HP_CHANGED, this.onPlayerHpChanged, this);
    gameEvents.off(PLAYER_EVENTS.DEATH, this.onPlayerDeath, this);
  }
}
```

## アンチパターン

### ❌ Avoid
```typescript
// コンポーネントがEventEmitterを継承
export class PlayerStats extends Phaser.Events.EventEmitter {
  setHp(value: number): void {
    this.emit('hpChange', value);  // NG!
  }
}

// 文字列リテラルでイベント名
gameEvents.emit('hpChange', hp);  // NG!
```

### ✅ Prefer
```typescript
// EventEmitterを継承しない
export class PlayerStats {
  setHp(value: number): void {
    gameEvents.emit(PLAYER_EVENTS.HP_CHANGED, { hp: value, maxHp: this.maxHp });
  }
}

// 定数でイベント名管理
gameEvents.emit(PLAYER_EVENTS.HP_CHANGED, data);
gameEvents.on(PLAYER_EVENTS.MP_CHANGED, handler);
```

## 命名規則

### イベント名定数
- `CATEGORY_EVENTS` オブジェクト（例: `PLAYER_EVENTS`, `ENEMY_EVENTS`）
- プロパティは `UPPER_SNAKE_CASE`（例: `HP_CHANGED`, `LEVEL_UP`）
- 値は `category:action-target` 形式（例: `'player:hp-changed'`）

### イベントデータ型
- `CategoryActionData` 形式（例: `PlayerHpChangedData`）

## ライフサイクル管理
```typescript
create(): void {
  gameEvents.on(EVENT_NAME, this.handler, this);
}

shutdown(): void {
  gameEvents.off(EVENT_NAME, this.handler, this);
}
```

## スコープ限定イベント（PlayableSceneスコープ）

アプリ全体ではなく、ゲームプレイシーン共通のイベントとして管理する場合は、
PlayableSceneが持つ`sceneEvents`を使用します。

### PlayableSceneでのイベント管理
```typescript
// PlayableScene.tsに定義済み
export abstract class PlayableScene extends Core {
  protected sceneEvents: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();

  getPlayableSceneEvents(): Phaser.Events.EventEmitter {
    return this.sceneEvents;
  }

  protected destroyControllers(): void {
    // シーン終了時にリスナーをクリーンアップ
    this.sceneEvents.removeAllListeners();
  }
}
```

### コンポーネントからのデュアルエミット
後方互換性を維持しつつ、sceneEventsへも発火するパターン：
```typescript
export class PlayerStatsGameplayComponent extends Phaser.Events.EventEmitter {
  private sceneEvents?: Phaser.Events.EventEmitter;

  constructor(scene: Phaser.Scene, config: PlayerStatsConfig = {}) {
    super();
    // PlayableSceneの場合、sceneEventsを取得
    if ('getPlayableSceneEvents' in scene) {
      this.sceneEvents = (scene as PlayableSceneLike).getPlayableSceneEvents();
    }
  }

  setHp(value: number): void {
    // ...
    if (this.hp !== oldHp) {
      // ✅ sceneEventsへ発火
      if (this.sceneEvents) {
        const data: PlayerHpChangedData = { hp: this.hp, maxHp: this.maxHp };
        this.sceneEvents.emit(PLAYER_EVENTS.HP_CHANGED, data);
      }
    }
  }
}
```

### PlayableSceneでの購読
```typescript
// sceneEvents経由での新しい購読方法
this.sceneEvents.on(
  PLAYER_EVENTS.HP_CHANGED,
  (data: PlayerHpChangedData) => {
    this.hpBar?.setValueFromNumbers(data.hp, data.maxHp);
  }
);
```

## コーディング規約

- イベント名は必ず定数を使用
- イベントデータは型定義を作成
- リスナー登録時は必ずcontextを指定
- Scene終了時は必ずリスナー解除
