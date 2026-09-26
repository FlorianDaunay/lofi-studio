//! Save / open a share file through the OS file dialogs.
//!
//! The dialog is opened here, in Rust, and the frontend only ever receives or hands over the file's
//! *contents*: it never gets to name a path, so a compromised page cannot read or write arbitrary files.
//!
//! On Android the dialogs return `content://` URIs rather than paths; the fs plugin's Rust API
//! opens both kinds. It is used from Rust only: no fs permission is granted to the webview.

use std::io::{Read, Write};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::{FsExt, OpenOptions};

/// Share files are small; this only stops someone opening a huge unrelated file by mistake.
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
        .add_filter("Lofi Studio share", &["json"])
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let mut options = OpenOptions::new();
    options.write(true).create(true).truncate(true);
    let mut file = app.fs().open(picked, options).map_err(|e| e.to_string())?;
    file.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Asks for a file to open and returns its text, or `None` if the user cancelled.
#[tauri::command]
pub async fn open_text_file(app: AppHandle) -> Result<Option<String>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("Lofi Studio share", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let mut options = OpenOptions::new();
    options.read(true);
    let file = app.fs().open(picked, options).map_err(|e| e.to_string())?;
    // Read one byte past the limit: enough to tell a file is too large without loading all of it.
    let mut text = String::new();
    file.take(MAX_BYTES + 1).read_to_string(&mut text).map_err(|e| e.to_string())?;
    if text.len() as u64 > MAX_BYTES {
        return Err("this file is too large to be a Lofi Studio share".into());
    }
    Ok(Some(text))
}
