use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StripConfig {
    pub relay_url: Option<String>,
    pub strip_click_through: Option<bool>,
    pub strip_remember_position: Option<bool>,
    pub strip_x: Option<i32>,
    pub strip_y: Option<i32>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_save,
            write_save,
            read_strip_config,
            write_strip_config,
            dock_strip_window,
            set_strip_click_through,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            if let Some(window) = handle.get_webview_window("main") {
                let app_handle = handle.clone();
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Moved(position) = event {
                        if let Ok(Some(mut cfg)) = read_strip_config(app_handle.clone()) {
                            if cfg.strip_remember_position.unwrap_or(true) {
                                cfg.strip_x = Some(position.x);
                                cfg.strip_y = Some(position.y);
                                let _ = write_strip_config(app_handle.clone(), cfg);
                            }
                        }
                    }
                });
                let _ = dock_strip_internal(&window_clone, &handle);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("zbd_save.json"))
}

fn strip_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("strip_config.json"))
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

#[tauri::command]
fn read_strip_config(app: tauri::AppHandle) -> Result<Option<StripConfig>, String> {
    let path = strip_config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_strip_config(app: tauri::AppHandle, config: StripConfig) -> Result<(), String> {
    let path = strip_config_path(&app)?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn dock_strip_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    dock_strip_internal(&window, &app)
}

#[tauri::command]
fn set_strip_click_through(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|e| e.to_string())?;
    let mut cfg = read_strip_config(app.clone())?.unwrap_or_default();
    cfg.strip_click_through = Some(enabled);
    write_strip_config(app, cfg)
}

fn dock_strip_internal(window: &tauri::WebviewWindow, app: &tauri::AppHandle) -> Result<(), String> {
    let cfg = read_strip_config(app.clone())?.unwrap_or_default();
    let click_through = cfg.strip_click_through.unwrap_or(false);
    let remember = cfg.strip_remember_position.unwrap_or(true);

    let size = window.outer_size().map_err(|e| e.to_string())?;
    let width = size.width as i32;
    let height = size.height as i32;

    if remember {
        if let (Some(x), Some(y)) = (cfg.strip_x, cfg.strip_y) {
            window
                .set_position(tauri::PhysicalPosition::new(x, y))
                .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no monitor".to_string())?;

    let work = monitor.work_area();
    let x = work.position.x + ((work.size.width as i32 - width) / 2).max(0);
    let y = work.position.y + work.size.height as i32 - height;

    window
        .set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;

    if remember {
        let mut next = cfg;
        next.strip_x = Some(x);
        next.strip_y = Some(y);
        write_strip_config(app.clone(), next)?;
    }

    if click_through {
        window
            .set_ignore_cursor_events(true)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
