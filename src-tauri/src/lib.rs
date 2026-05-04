mod backup;
mod vault;

#[tauri::command]
fn export_backup(library_path: String, output_path: String) -> Result<String, String> {
    backup::export_backup(&library_path, &output_path)
}

#[tauri::command]
fn restore_backup(backup_path: String, target_path: String) -> Result<(), String> {
    backup::restore_backup(&backup_path, &target_path)
}

#[tauri::command]
fn remove_import_staging_file(library_path: String, candidate_path: String) -> Result<(), String> {
    vault::remove_import_staging_file(&library_path, &candidate_path)
}

#[tauri::command]
fn paths_refer_to_same_location(first_path: String, second_path: String) -> Result<bool, String> {
    vault::paths_refer_to_same_location(&first_path, &second_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            export_backup,
            restore_backup,
            remove_import_staging_file,
            paths_refer_to_same_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
