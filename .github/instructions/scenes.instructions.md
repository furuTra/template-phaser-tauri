---
applyTo: "src/scenes/**/*.ts"
description: Phaserシーン実装の指示
---

# Phaserシーン実装ガイドライン

## このファイルが適用される場所
- `src/scenes/` 配下のすべてのTypeScriptファイル

## シーン実装ルール

### 必須メソッド
1. `constructor()`: シーンキーを設定
2. `preload()`: アセット読み込み
3. `preload()`: DBリソース取得（必要に応じて）
4. `create()`: シーン初期化
5. `update()`: ゲームループ（オプション）

### アセット管理
- アセットキーは`AssetKeys`定数を使用
- `preload()`で読み込み、`create()`で使用

### シーン遷移
- `this.scene.start('SceneName')`: 切り替え
- `this.scene.launch('OverlayName')`: 追加
- `this.scene.stop()`: 停止

### ディレクトリ構成

- src/scenes/: Phaserゲームシーン
- src/scenes/internal/: ゲームシーンの共通処理
- src/scenes/overlay/: ゲームUI用のシーン

### クラス命名規則

#### src/scenes
ゲームシーン
- 命名: `XxxScene.ts` 形式

#### src/scenes/internal
ゲームシーン共通のロジック
- 命名: `Xxx.ts` 形式

#### src/scenes/overlay
ゲーム画面に重ねて表示するシーン
- UI、設定ダイアログ、メニューなど
- 命名: `XxxOverlay.ts`形式

### コーディング規約
- TypeScript strict mode有効
- Phaser Scene はクラスベース
- エラーハンドリング必須
- Phaser Scene の update()でクラスインスタンスを作成しない
- 型定義は先頭でインポート
- 絶対パス優先（@/エイリアス使用）

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
