//! Persistence of the user's configuration: one small JSON file in the app-config directory.
//!
//! The frontend owns the schema and validates it; this side only guarantees that what lands on
//! disk is well-formed JSON of a sane size, and that a crash mid-write never corrupts the file.

use std::{fs, io, path::PathBuf};
use tauri::{AppHandle, Manager};

const FILE_NAME: &str = "config.json";
/// A library of a couple hundred songs is well under this; anything bigger is a bug or abuse.
const MAX_BYTES: usize = 1024 * 1024;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(FILE_NAME))
}

/// Returns the saved JSON, or `None` on first launch.
#[tauri::command]
pub fn load_config(app: AppHandle) -> Result<Option<String>, String> {
    let path = config_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(text) if text.len() <= MAX_BYTES => Ok(Some(text)),
        Ok(_) => Err("the saved configuration is too large".into()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Validates and atomically writes the configuration (temp file, then rename).
#[tauri::command]
pub fn save_config(app: AppHandle, json: String) -> Result<(), String> {
    write_config(&config_path(&app)?, &json)
}

fn write_config(path: &PathBuf, json: &str) -> Result<(), String> {
    if json.len() > MAX_BYTES {
        return Err("configuration is too large".into());
    }
    serde_json::from_str::<serde_json::Value>(json).map_err(|e| format!("invalid JSON: {e}"))?;

    let dir = path.parent().ok_or("configuration path has no parent")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("lofi-studio-test-{}-{name}", std::process::id())).join(FILE_NAME)
    }

    #[test]
    fn round_trips_valid_json() {
        let path = temp_path("ok");
        write_config(&path, r#"{"version":1}"#).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), r#"{"version":1}"#);
        fs::remove_dir_all(path.parent().unwrap()).unwrap();
    }

    #[test]
    fn rejects_invalid_json_and_oversized_payloads() {
        let path = temp_path("bad");
        assert!(write_config(&path, "not json").is_err());
        assert!(write_config(&path, &format!("\"{}\"", "a".repeat(MAX_BYTES))).is_err());
        assert!(!path.exists());
    }
}
