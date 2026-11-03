use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_save, write_save])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("zbd_save.json"))
}

#[tauri::command]
fn read_save(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = save_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_save(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = save_path(&app)?;
    fs::write(path, contents).map_err(|e| e.to_string())
}
