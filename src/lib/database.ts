import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

// 型定義
export interface SaveData {
  id: number;
  title: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface GameData {
  lv: number;
  exp: number;
}

// DB接続（シングルトン）
let db: Database | null = null;
let dbPath: string | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    if (!dbPath) {
      dbPath = await invoke<string>('get_db_path');
      console.log('Database path from Rust:', dbPath);
    }
    db = await Database.load(dbPath);
  }
  return db;
}

// 全セーブデータ取得
export async function getAllSaves(): Promise<SaveData[]> {
  const database = await getDatabase();
  return await database.select<SaveData[]>('SELECT * FROM saves ORDER BY updated_at DESC');
}

// セーブデータ取得（ID指定）
export async function getSaveById(id: number): Promise<SaveData | null> {
  const database = await getDatabase();
  const results = await database.select<SaveData[]>(
    'SELECT * FROM saves WHERE id = $1',
    [id]
  );
  return results[0] ?? null;
}

// JSON を GameData にパース
export function parseGameData(save: SaveData): GameData {
  return JSON.parse(save.data) as GameData;
}

// デフォルトのゲームデータ
export function getDefaultGameData(): GameData {
  return {
    lv: 1,
    exp: 0,
  };
}

/**
 * 新規セーブデータを作成
 * @param title セーブデータのタイトル
 * @param data ゲームデータ
 * @returns 作成されたセーブデータ
 */
export async function createSave(title: string, data: GameData): Promise<SaveData> {
  const database = await getDatabase();
  const dataJson = JSON.stringify(data);
  const now = new Date().toISOString();

  const result = await database.execute(
    'INSERT INTO saves (title, data, created_at, updated_at) VALUES ($1, $2, $3, $4)',
    [title, dataJson, now, now]
  );

  // 作成したセーブデータを返す
  return {
    id: result.lastInsertId as number,
    title,
    data: dataJson,
    created_at: now,
    updated_at: now,
  };
}
