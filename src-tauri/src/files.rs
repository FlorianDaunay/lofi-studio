//! Save / open a shared song through the OS file dialogs.
//!
//! The dialog is opened here, in Rust, and the frontend only ever receives or hands over the file's
//! *contents*: it never gets to name a path, so a compromised page cannot read or write arbitrary files.

use std::fs;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Song files are tiny; this only stops someone opening a huge unrelated file by mistake.
const MAX_BYTES: u64 = 1024 * 1024;

/// Asks where to save `contents`. Returns `false` if the user cancelled.
#[tauri::command]
pub async fn save_text_file(app: AppHandle, default_name: String, contents: String) -> Result<bool, String> {
    if contents.len() as u64 > MAX_BYTES {
        return Err("the file would be too large".into());
    }
    let Some(picked) = app
        .dialog()
        .file()
        .set_file_name(default_name)
        .add_filter("Lofi Studio song", &["json"])
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    fs::write(path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Asks for a file to open and returns its text, or `None` if the user cancelled.
#[tauri::command]
pub async fn open_text_file(app: AppHandle) -> Result<Option<String>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("Lofi Studio song", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    let size = fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if size > MAX_BYTES {
        return Err("this file is too large to be a song".into());
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}
