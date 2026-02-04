---
applyTo: "src/components/**/*.ts"
description: 再利用可能なコンポーネント実装の指示
---

# Phaserコンポーネント実装ガイドライン

## このファイルが適用される場所
- `src/components/` 配下のすべてのTypeScriptファイル

## コンポーネント実装ルール

### アセット管理
- アセットキーは`AssetKeys`定数を使用
- `preload()`で読み込み、`create()`で使用

### シーン遷移
- `this.scene.start('SceneName')`: 切り替え
- `this.scene.launch('OverlayName')`: 追加
- `this.scene.stop()`: 停止

### ディレクトリ構成

- src/components/: コンポーネント
- src/components/ui/: ゲームUIの共通コンポーネント（ボタン、ダイアログなど）
- src/components/gameplay/: ゲームプレイ関連の共通コンポーネント（ヘルスバーなど）

### クラス命名規則

#### src/components
コンポーネント
- 命名: `XxxComponent.ts` 形式

#### src/components/ui
ゲームUIの共通コンポーネント
- 命名: `XxxUIComponent.ts` 形式

#### src/components/gameplay
ゲームプレイ関連の共通コンポーネント
- 命名: `XxxGameplayComponent.ts` 形式

### コーディング規約
- TypeScript strict mode有効
- エラーハンドリング必須
- 複数シーンで使いまわし可能な設計とすること
- 型定義は先頭でインポート
- 絶対パス優先（@/エイリアス使用）

### ゲームオブジェクトの継承規約

#### gameplay コンポーネント（src/components/gameplay/）
- **物理判定を持つオブジェクト**: `Phaser.Physics.Arcade.Sprite` を継承すること
  - 弾、敵、プレイヤーなど、衝突判定が必要なオブジェクト
  - テクスチャがない場合は動的に生成する
- **データ管理クラス**: GameObjectを継承しない純粋なTypeScriptクラスとして実装可（例: PlayerStatsGameplayComponent）

#### UI コンポーネント（src/components/ui/）
- `Phaser.GameObjects.Container` を継承すること
- 複数のUI要素をグループ化して管理する

## 例
```typescript
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image(AssetKeys.Texture.PLAYER, 'assets/texture/player.png');
  }

  create(): void {
    const player = this.add.image(100, 100, AssetKeys.Texture.PLAYER);
  }
}
```

