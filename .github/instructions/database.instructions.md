---
applyTo: "src/lib/**/*Database*.ts"
description: データベース操作の指示
---

# データベース操作ガイドライン

## Tauri invoke パターン

### セーブデータ保存
```typescript
import { invoke } from '@tauri-apps/api/core';

async function saveGame(data: SaveData): Promise<void> {
  try {
    await invoke('save_game_data', { 
      data: JSON.stringify(data) 
    });
  } catch (error) {
    console.error('Save failed:', error);
    throw error;
  }
}
```

### セーブデータ読み込み
```typescript
async function loadGame(): Promise<SaveData | null> {
  try {
    const json = await invoke<string>('load_game_data');
    return JSON.parse(json);
  } catch (error) {
    console.error('Load failed:', error);
    return null;
  }
}
```

## 必須事項
- 必ず`try-catch`でエラーハンドリング
- エラー発生時はコンソールにログ出力
- `async/await`を使用
- SQLインジェクション対策を徹底
- 型安全性を保つ
- データベースから取得するデータに応じて型定義を作成
- JSONシリアライズ/デシリアライズを適切に行う
- シーンに依存しない汎用機能
- シングルトンパターンとすること
