---
applyTo: "src/scenes/**/*PlayScene*.ts"
description: ゲームシーン実装の指示
---

# ゲームPhaserシーン実装ガイドライン

## このファイルが適用される場所
- `src/scenes/` 配下のPlaySceneが付くTypeScriptファイル

## シーン実装ルール

### 継承元
- `PlayableScene` クラスを継承すること

### シーン遷移
- シーン間の遷移は `transitionToScene` メソッドを使用し、遷移先シーンのキーとプレイヤーの開始位置を指定すること
```typescript
this.transitionToScene('NextSceneKey', 'StartPositionIdentifier');
```

### プレイヤースポーン位置
- `StartPosition` 識別子を使用して、プレイヤーのスポーン位置を決定すること
- `PlayableScene` クラスの `getSpawnX` メソッドを利用してX座標を取得すること

### シーンルール
- 各シーンは `PlayableSceneConfig` を使用して初期化すること
- 必要に応じて `createPlayer` メソッドをオーバーライドしてプレイヤーの生成ロジックを追加すること
- UIを表示する場合は、`createUI` メソッドを使用すること

