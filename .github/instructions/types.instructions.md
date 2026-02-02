```instructions
---
applyTo: "src/**/*Types*.ts"
description: 型定義ファイル実装の指示
---

# 型定義ファイル（*Types*.ts）実装ガイドライン

## このファイルが適用される場所
- ファイル名に `Types` を含むすべてのTypeScriptファイル

## 基本ルール

### 許可される内容
- 型定義（`type`、`interface`）
- 列挙型（`enum`）
- 定数オブジェクト（`const`）
- 型ガード関数（引数の型をチェックして `is` を返すもののみ）

### 禁止される内容
- クラス定義
- ビジネスロジックを含む関数
- Phaserやその他ライブラリの処理を呼び出すコード
- 副作用を持つコード

## 命名規則
- ファイル名: `XxxTypes.ts` 形式
- 型名: パスカルケース（例: `BulletTypeId`）
- 定数: アッパースネークケースまたはパスカルケース（例: `BULLET_TYPES`）

## コーディング規約
- TypeScript strict mode有効
- 型定義は先頭でインポート（`import type`を使用）
- JSDocコメントで型の用途を明確に記述

## 例

```typescript
import type { SomeType } from '@/types/SomeType';

/**
 * 弾の種類ID
 */
export type BulletTypeId = 'single' | 'triple' | 'spread';

/**
 * 弾の種類定義
 */
export interface BulletTypeDefinition {
  /** 種類ID */
  id: BulletTypeId;
  /** 表示名 */
  name: string;
}

/**
 * 弾の種類定義マップ
 */
export const BULLET_TYPES: Record<BulletTypeId, BulletTypeDefinition> = {
  single: { id: 'single', name: '単発' },
  triple: { id: 'triple', name: '3方向' },
  spread: { id: 'spread', name: '拡散' },
};

/**
 * 型ガード: BulletTypeIdかどうかを判定
 */
export function isBulletTypeId(value: string): value is BulletTypeId {
  return value in BULLET_TYPES;
}
```
```
