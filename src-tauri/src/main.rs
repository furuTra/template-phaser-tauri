// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod migrations;

use std::path::Path;
use tauri_plugin_sql::Builder as SqlBuilder;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_db_path() -> String {
    if cfg!(debug_assertions) {
        // 開発時: プロジェクトルート/game.db
        // CARGO_MANIFEST_DIR = src-tauri なので、親ディレクトリがプロジェクトルート
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let project_root = Path::new(manifest_dir).parent().unwrap();
        let db_path = project_root.join("game.db");

        // Windowsのバックスラッシュをスラッシュに変換
        let db_path_str = db_path.to_string_lossy().replace("\\", "/");
        format!("sqlite:{}?mode=rwc", db_path_str)
    } else {
        "sqlite:game.db".to_string()
    }
}

fn main() {
    // src-tauri/game.db に保存
    let db_path = get_db_path();

    // デバッグ用
    println!("Database path: {}", db_path);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            SqlBuilder::default()
                .add_migrations(&db_path, migrations::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, get_db_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

