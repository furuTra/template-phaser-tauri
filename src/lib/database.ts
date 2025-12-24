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