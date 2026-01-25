---
applyTo: "src/lib/cache/**/*Manager*.ts"
description: フロントエンド状態管理Store実装の指示
---

# フロントエンド状態管理（Store）ガイドライン

## このファイルが適用される場所
- `src/lib/cache/` 配下のすべてのTypeScriptファイル

## Managerの役割定義

### 位置づけ
ManagerはFlux/Reduxにおける**Store**に相当し、フロントエンド側のデータ保管場所を操作するクラスである。

### 責務
- ✅ DBから取得したデータをメモリに保持
- ✅ View層（Phaserシーン）へのデータ提供
- ✅ データの更新管理（キャッシュの同期）
- ❌ DB操作の実装（DatabaseHelperに委譲）
- ❌ ビジネスロジックの実装（Scene側で実装）

### アーキテクチャ上の位置
```
┌──────────────────────────────────────┐
│ View Layer (Phaser Scenes)           │  ← データ参照・更新リクエスト
└──────────────┬───────────────────────┘
               ↓ get(), update()
┌──────────────────────────────────────┐
│ Manager (Store)                      │  ← フロントエンド状態管理
│ - データキャッシュ保持               │
│ - isDirtyフラグ管理                  │
└──────────────┬───────────────────────┘
               ↓ load(), save()
┌──────────────────────────────────────┐
│ DatabaseHelper (Repository)          │  ← DB操作専門
└──────────────┬───────────────────────┘
               ↓ invoke()
┌──────────────────────────────────────┐
│ Tauri Backend → SQLite               │
└──────────────────────────────────────┘
```

## 必須実装パターン

### シングルトンStoreパターン
```typescript
export class SaveDataManager {
  private static instance: SaveDataManager;
  
  // Store（データ保持領域）
  private store: SaveData | null = null;
  
  // 変更追跡フラグ
  private isDirty: boolean = false;

  private constructor() {}

  static getInstance(): SaveDataManager {
    if (!SaveDataManager.instance) {
      SaveDataManager.instance = new SaveDataManager();
    }
    return SaveDataManager.instance;
  }
}
```

### Store操作メソッド（必須セット）
```typescript
export class SaveDataManager {
  /**
   * 初期化: DBからデータをロードしてStoreに格納
   * @returns ロードしたデータ
   */
  async load(): Promise {
    const dbHelper = DatabaseHelper.getInstance();
    this.store = await dbHelper.loadSaveData();
    this.isDirty = false;
    return this.store;
  }

  /**
   * 取得: Storeからデータを取得（読み取り専用）
   * @returns 現在のStore内のデータ
   */
  get(): SaveData | null {
    return this.store;
  }

  /**
   * 更新: Storeのデータを更新（メモリのみ、DB未保存）
   * @param data 更新データ（部分更新可）
   */
  update(data: Partial): void {
    if (this.store) {
      this.store = { ...this.store, ...data };
      this.isDirty = true;
    }
  }

  /**
   * フィールド更新: 特定フィールドのみ更新（型安全）
   * @param key フィールド名
   * @param value 新しい値
   */
  updateField(
    key: K,
    value: SaveData[K]
  ): void {
    if (this.store) {
      this.store[key] = value;
      this.isDirty = true;
    }
  }

  /**
   * 永続化: StoreのデータをDBに保存
   */
  async save(): Promise {
    if (!this.store) {
      throw new Error('No data in store to save');
    }

    const dbHelper = DatabaseHelper.getInstance();
    await dbHelper.saveSaveData(this.store);
    this.isDirty = false;
  }

  /**
   * 自動保存: 変更がある場合のみ保存
   */
  async autoSave(): Promise {
    if (this.isDirty) {
      await this.save();
    }
  }

  /**
   * 状態確認: 未保存の変更があるか
   * @returns true: 未保存あり, false: すべて保存済み
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * クリア: Storeをクリア
   */
  clear(): void {
    this.store = null;
    this.isDirty = false;
  }
}
```
## データの流れ

### 初期化フロー（ゲーム起動時）
```
TitleScene.create()
    ↓
SaveDataManager.getInstance().load()
    ↓
DatabaseHelper.loadSaveData()
    ↓
invoke('load_game_data')
    ↓
SQLite → JSON → Parse
    ↓
Store に格納
```

### 参照フロー（ゲームプレイ中）
```
GameScene.create()
    ↓
SaveDataManager.getInstance().get()
    ↓
Store から取得（高速、DBアクセスなし）
    ↓
データを使用
```

### 更新フロー（データ変更時）
```
GameScene.onGoldEarned()
    ↓
SaveDataManager.getInstance().update({ gold: newGold })
    ↓
Store を更新（メモリのみ）
isDirty = true
```

### 保存フロー（セーブポイント）
```
GameScene.onStageClear()
    ↓
SaveDataManager.getInstance().save()
    ↓
DatabaseHelper.saveSaveData(store)
    ↓
invoke('save_game_data', { data: JSON.stringify(store) })
    ↓
SQLite に保存
isDirty = false
```

## Store設計原則

### イミュータブル更新

Storeのデータは常にイミュータブルに更新する：
```typescript
// Good: 新しいオブジェクトを生成
update(data: Partial): void {
  this.store = { ...this.store, ...data };
  this.isDirty = true;
}

// Avoid: 直接変更（ミューテーション）
update(data: Partial): void {
  Object.assign(this.store, data);  // NG!
  this.isDirty = true;
}
```

### 読み取り専用の返却

Storeから取得したデータの直接変更を防ぐ：
```typescript
// Good: 必要に応じてクローンを返す
get(): SaveData | null {
  return this.store ? { ...this.store } : null;
}

// または、読み取り専用であることを型で明示
get(): Readonly | null {
  return this.store;
}

// シンプルな実装（デフォルト）
get(): SaveData | null {
  return this.store;
}
```

### 単一責任の原則

1つのManagerは1種類のデータのみを管理：
```typescript
// Good: 1Manager = 1データ種別
class SaveDataManager {
  private store: SaveData | null = null;
}

class GameStateManager {
  private store: GameState | null = null;
}

// Avoid: 複数種類のデータを1つで管理
class DataManager {
  private saveData: SaveData | null = null;
  private gameState: GameState | null = null;  // NG!
}
```

## View層からの利用パターン

### 基本的な使い方
```typescript
export class GameScene extends Phaser.Scene {
  create(): void {
    // Store からデータ取得
    const saveManager = SaveDataManager.getInstance();
    const saveData = saveManager.get();
    
    if (saveData) {
      // データを使用
      this.initPlayer(saveData.level, saveData.experience);
      this.showGold(saveData.gold);
    }
  }

  onGoldEarned(amount: number): void {
    const saveManager = SaveDataManager.getInstance();
    const currentData = saveManager.get();
    
    if (currentData) {
      // Store を更新（メモリのみ）
      saveManager.update({ 
        gold: currentData.gold + amount 
      });
      
      // UI更新
      this.showGold(currentData.gold + amount);
    }
  }

  async onStageClear(): Promise {
    const saveManager = SaveDataManager.getInstance();
    
    // Store を更新
    saveManager.update({
      currentStage: 'stage_2',
      lastSavedAt: new Date().toISOString()
    });
    
    // DB に永続化
    await saveManager.save();
  }
}
```

### 複数Managerの併用
```typescript
export class GameScene extends Phaser.Scene {
  create(): void {
    // 永続データ（SaveData）
    const saveManager = SaveDataManager.getInstance();
    const saveData = saveManager.get();
    
    // 一時データ（GameState）
    const stateManager = GameStateManager.getInstance();
    stateManager.init({
      currentHp: saveData.maxHp,
      position: { x: 0, y: 0 },
      combo: 0
    });
  }

  update(): void {
    // 一時データは頻繁に更新（保存不要）
    const stateManager = GameStateManager.getInstance();
    const state = stateManager.get();
    
    if (state) {
      stateManager.updateField('position', {
        x: this.player.x,
        y: this.player.y
      });
    }
  }

  onPlayerDamaged(damage: number): void {
    // 一時データ更新
    const stateManager = GameStateManager.getInstance();
    const state = stateManager.get();
    
    if (state) {
      stateManager.updateField('currentHp', state.currentHp - damage);
      
      // ゲームオーバー判定
      if (state.currentHp <= 0) {
        this.gameOver();
      }
    }
  }
}
```

## エラーハンドリング

### View層でのエラー処理
```typescript
async saveGame(): Promise {
  const saveManager = SaveDataManager.getInstance();
  
  try {
    await saveManager.save();
    this.showMessage('セーブしました');
  } catch (error) {
    console.error('Save failed:', error);
    this.showMessage('セーブに失敗しました');
  }
}
```

### Manager層でのエラー処理
```typescript
async save(): Promise {
  if (!this.store) {
    throw new Error('No data in store to save');
  }

  try {
    const dbHelper = DatabaseHelper.getInstance();
    await dbHelper.saveSaveData(this.store);
    this.isDirty = false;
  } catch (error) {
    console.error('[SaveDataManager] Save failed:', error);
    throw error;  // 上位に伝播
  }
}
```

## デバッグ支援

### 開発モード専用ログ
```typescript
update(data: Partial): void {
  if (import.meta.env.DEV) {
    console.log('[SaveDataManager] Updating store:', data);
    console.log('[SaveDataManager] Current store:', this.store);
  }
  
  if (this.store) {
    this.store = { ...this.store, ...data };
    this.isDirty = true;
  }
}
```

### Store状態の可視化
```typescript
// 開発用メソッド（本番ビルドでは除外）
if (import.meta.env.DEV) {
  getDebugInfo(): { store: SaveData | null; isDirty: boolean } {
    return {
      store: this.store,
      isDirty: this.isDirty
    };
  }
}
```

## テストのガイドライン

### Store状態のテスト
```typescript
describe('SaveDataManager', () => {
  it('should update store immutably', () => {
    const manager = SaveDataManager.getInstance();
    manager.load(); // モックデータ読み込み
    
    const before = manager.get();
    manager.update({ gold: 1000 });
    const after = manager.get();
    
    // イミュータブルであることを確認
    expect(before).not.toBe(after);
    expect(after?.gold).toBe(1000);
  });

  it('should mark as dirty after update', () => {
    const manager = SaveDataManager.getInstance();
    manager.load();
    
    expect(manager.hasUnsavedChanges()).toBe(false);
    manager.update({ gold: 1000 });
    expect(manager.hasUnsavedChanges()).toBe(true);
  });
});
```

## アンチパターン

### ❌ Avoid
```typescript
// Manager内でDB操作を直接実装
async save(): Promise {
  await invoke('save_game_data', { data: this.store });  // NG!
}

// update()内でDB保存
update(data: Partial): void {
  this.store = { ...this.store, ...data };
  this.save();  // NG! 頻繁なDB書き込み
}

// View層がStoreを直接変更
const manager = SaveDataManager.getInstance();
manager.store.gold += 100;  // NG! privateメンバーへのアクセス

// Managerがビジネスロジックを持つ
calculateDamage(attack: number, defense: number): number {  // NG!
  return Math.max(attack - defense, 0);
}
```

### ✅ Prefer
```typescript
// DatabaseHelperに委譲
async save(): Promise {
  const dbHelper = DatabaseHelper.getInstance();
  await dbHelper.saveSaveData(this.store);
}

// update()はStoreのみ更新、save()は別途呼ぶ
update(data: Partial): void {
  this.store = { ...this.store, ...data };
  this.isDirty = true;
}

// 公開メソッド経由でアクセス
const manager = SaveDataManager.getInstance();
const currentGold = manager.get()?.gold ?? 0;
manager.update({ gold: currentGold + 100 });

// ビジネスロジックはView層に
// GameScene.ts
onAttack(): void {
  const damage = this.calculateDamage(this.attack, enemy.defense);
  // ...
}
```

## パフォーマンス最適化

### 読み取り最適化

- Storeからの取得は常に高速（DBアクセスなし）
- 必要に応じてメモ化を検討

### 書き込み最適化

- isDirtyフラグで不要な保存を防ぐ
- autoSave()で変更時のみ保存
- バッチ更新を活用
```typescript
// Good: バッチ更新
manager.update({
  gold: newGold,
  experience: newExp,
  level: newLevel
});

// Avoid: 個別更新を繰り返す
manager.updateField('gold', newGold);
manager.updateField('experience', newExp);
manager.updateField('level', newLevel);
```

## 命名規則

### クラス名
- `XxxManager` 形式（例: `SaveDataManager`, `GameStateManager`）

### メソッド名
- `load()`: DB→Storeへのロード
- `get()`: Storeからの取得
- `update()`: Storeの更新
- `save()`: Store→DBへの保存
- `clear()`: Storeのクリア

### 変数名
- `store`: データ保持領域
- `isDirty`: 変更追跡フラグ

### コーディング規約
- TypeScript strict mode有効
- エラーハンドリング必須
- 単一責任の原則に従うこと
- 型定義は先頭でインポート
- 絶対パス優先（@/エイリアス使用）