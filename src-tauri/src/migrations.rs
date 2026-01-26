use tauri_plugin_sql::{Migration, MigrationKind};
// use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 20251221,
        description: "Initial migration to create saves table",
        kind: MigrationKind::Up,
        sql: include_str!("../migrations/20251221_init.sql"),
    }]
}

