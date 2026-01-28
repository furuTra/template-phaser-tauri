---
applyTo: "src/utils/**/*.ts"
description: 再利用可能な計算処理実装の指示
---

# ユーティリティ関数実装ガイドライン

共通で使いまわす計算処理や、ロジックをユーティリティ関数として実装する際のルールを定めます。

## このファイルが適用される場所
- `src/utils/` 配下のすべてのTypeScriptファイル

## ユーティリティ関数実装ルール

### ディレクトリ構成

- src/utils/: ユーティリティ
- src/utils/ui/: ゲームUIの共通処理（ボタン、ダイアログなど）
- src/utils/gameplay/: ゲームプレイ関連の共通処理（スコア計算、レベルアップ処理など）
- src/utils/common/: 汎用的な共通処理（配列操作、文字列操作など）

### クラス命名規則
- 命名: `XxxUtil.ts` 形式

### コーディング規約
- TypeScript strict mode有効
- エラーハンドリング必須
- 型定義は先頭でインポート
- 絶対パス優先（@/エイリアス使用）もっと表示23:46ユーティリティ設計を精査し、Pure Function原則と構造改善を提案した。14sユーザーがゲームの計算処理をユーティリティ化しようとしている。HP計算、攻撃処理、衝突判定などをsrc/utils/に配置する方針のようだ。
提示された指示書を見ると：

src/utils/配下の構造は良い（ui/, gameplay/, common/）
命名規則はXxxUtil.ts

いくつか気になる点：

Pure Functionの原則が明記されていない - ユーティリティ関数は副作用がない純粋関数であるべき
状態を持たない原則 - クラスではなく関数エクスポートが基本
テスタビリティ - 単体テストしやすい設計
実装例が少ない - HP計算、攻撃処理、衝突判定の具体例がない
Phaserとの関係 - Phaser組み込み関数との使い分け
ビジネスロジックの配置 - どこまでをutilsに置くべきか

特に重要なのは：

Pure Function原則（同じ入力→同じ出力、副作用なし）
状態を持たない（Managerとの違い）
Phaser組み込み機能との使い分け（例：衝突判定はPhaser.Physics使うべき？）

また、ディレクトリ構造については：

src/utils/gameplay/ は良いが、もう少し細分化できる

combat/ (戦闘計算)
physics/ (物理計算、衝突判定)
level/ (レベルアップ、経験値計算)



命名規則も見直す必要がある。XxxUtil.ts より XxxUtils.ts (複数形) の方が一般的だし、math.ts や collision.ts のようにシンプルな名前でも問題ない。改善案を作成しよう。良い方向性ですが、いくつか重要な原則を追加すると、より保守性の高い設計になります！
📝 改善版: .github/instructions/utility.instructions.md
markdown---
applyTo: "src/utils/**/*.ts"
description: 再利用可能な計算処理実装の指示
---

# ユーティリティ関数実装ガイドライン

共通で使いまわす計算処理や、ロジックをユーティリティ関数として実装する際のルールを定めます。

## このファイルが適用される場所
- `src/utils/` 配下のすべてのTypeScriptファイル

## ユーティリティの基本原則

### 1. Pure Function（純粋関数）
- **同じ入力に対して常に同じ出力**を返す
- **副作用を持たない**（外部状態を変更しない）
- **引数を変更しない**（イミュータブル）
```typescript
// Good: Pure Function
export function calculateDamage(attack: number, defense: number): number {
  return Math.max(attack - defense, 0);
}

// Avoid: 副作用あり
let totalDamage = 0;
export function calculateDamage(attack: number, defense: number): number {
  totalDamage += attack - defense;  // NG! 外部状態を変更
  return totalDamage;
}

// Avoid: 引数を変更
export function applyDamage(player: Player, damage: number): Player {
  player.hp -= damage;  // NG! 引数を直接変更
  return player;
}

// Good: 新しいオブジェクトを返す
export function applyDamage(player: Player, damage: number): Player {
  return { ...player, hp: player.hp - damage };
}
```

### 2. 状態を持たない
- ユーティリティは**状態を保持しない**
- クラスインスタンス変数は使わない
- 必要な値はすべて引数で受け取る
```typescript
// Good: 状態なし
export function calculateExp(level: number, baseExp: number): number {
  return Math.floor(baseExp * Math.pow(1.5, level - 1));
}

// Avoid: 状態を持つ（これはManagerの役割）
class ExpUtil {
  private currentLevel = 1;  // NG! 状態を持っている
  
  calculateExp(): number {
    return this.currentLevel * 100;
  }
}
```

### 3. テスタビリティ
- 単体テストが容易な設計
- 依存を最小限にする
- 複雑な条件分岐は避ける

### 4. Phaserとの使い分け
- Phaserが提供する機能は**Phaserを使う**
- 独自のゲームロジックのみユーティリティ化
```typescript
// Avoid: Phaserに既にある機能
export function checkCollision(a: Phaser.GameObjects.Sprite, b: Phaser.GameObjects.Sprite): boolean {
  // Phaser.Physics.Arcade.overlap() を使うべき
}

// Good: 独自のゲームロジック
export function calculateCriticalHit(attack: number, critRate: number): {
  damage: number;
  isCritical: boolean;
} {
  const isCritical = Math.random() < critRate;
  const damage = isCritical ? attack * 2 : attack;
  return { damage, isCritical };
}
```

### ディレクトリ構成

- src/utils/: ユーティリティ
- src/utils/ui/: ゲームUIの共通処理（ボタン、ダイアログなど）
- src/utils/combat/: 戦闘関連計算（ダメージ計算、クリティカル判定など）
- src/utils/character/: キャラクター関連計算（レベルアップ、ステータス計算など）
- src/utils/physics/: 物理計算、衝突判定など
- src/utils/common/: 汎用的な共通処理（配列操作、文字列操作など）

## クラス命名規則
```
- 機能名.ts（例: Damage.ts, Level.ts）
- 複数の関連関数がある場合は複数形も可（例: Animations.ts）
```

## 関数命名規則

### 計算系
- `calculate*`: 計算結果を返す（例: `calculateDamage`, `calculateExp`）
- `compute*`: 複雑な計算（例: `computeTrajectory`）

### 判定系
- `is*`: 真偽値を返す（例: `isCriticalHit`, `isInRange`）
- `check*`: 検証結果を返す（例: `checkCollision`）

### 変換系
- `to*`: 型変換（例: `toPercent`, `toDisplayValue`）
- `format*`: フォーマット（例: `formatNumber`, `formatTime`）

### 生成系
- `generate*`: 生成（例: `generateRandomValue`, `generateUniqueId`）
- `create*`: 作成（例: `createConfig`）

## コーディング規約

- TypeScript strict mode有効
- すべての関数にJSDoc追加
- 型定義は先頭でインポート
- 絶対パス優先（@/エイリアス使用）
- Pure Functionの原則を遵守
- 副作用を持たない
- 状態を保持しない