//! What is playing, as the page reports it. The system's media controls show it (the tray menu on
//! the desktop, the notification on Android), and on the desktop it decides what closing the
//! window does: hide to the tray while music plays, quit otherwise.
//!
//! On Android, "playing" is also what keeps the app alive in the background: the Kotlin side holds
//! a foreground service only while it is true, so an idle app gets no background task.

use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};

/// Song and playlist names are short; this only rejects nonsense from a compromised page.
const MAX_TEXT_CHARS: usize = 200;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct NowPlaying {
    pub title: String,
    pub subtitle: String,
    pub playing: bool,
}

impl NowPlaying {
    fn new(title: String, subtitle: String, playing: bool) -> Result<Self, String> {
        for text in [&title, &subtitle] {
            if text.chars().count() > MAX_TEXT_CHARS {
                return Err("now-playing text is too long".into());
            }
        }
        Ok(Self { title, subtitle, playing })
    }
}

#[derive(Default)]
pub struct NowPlayingState(Mutex<NowPlaying>);

#[cfg(desktop)]
pub fn is_playing<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.try_state::<NowPlayingState>()
        .is_some_and(|state| state.0.lock().unwrap_or_else(|e| e.into_inner()).playing)
}

#[tauri::command]
pub async fn set_now_playing<R: Runtime>(app: AppHandle<R>, title: String, subtitle: String, playing: bool) -> Result<(), String> {
    let now = NowPlaying::new(title, subtitle, playing)?;
    *app.state::<NowPlayingState>().0.lock().unwrap_or_else(|e| e.into_inner()) = now.clone();
    #[cfg(desktop)]
    crate::tray::show_now_playing(&app, &now);
    #[cfg(target_os = "android")]
    android::show_now_playing(&app, &now).await?;
    Ok(())
}

#[cfg(target_os = "android")]
pub use android::plugin;

#[cfg(target_os = "android")]
mod android {
    use super::NowPlaying;
    use tauri::{
        plugin::{Builder, PluginHandle, TauriPlugin},
        AppHandle, Manager, Runtime,
    };

    struct Handle<R: Runtime>(PluginHandle<R>);

    /// Loads `MediaPlugin.kt` (in `gen/android`), which owns the playback service and its notification.
    pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
        Builder::new("media")
            .setup(|app, api| {
                app.manage(Handle(api.register_android_plugin("com.lofistudio.app", "MediaPlugin")?));
                Ok(())
            })
            .build()
    }

    pub async fn show_now_playing<R: Runtime>(app: &AppHandle<R>, now: &NowPlaying) -> Result<(), String> {
        let handle = app.state::<Handle<R>>().0.clone();
        let payload = serde_json::json!({ "title": now.title, "subtitle": now.subtitle, "playing": now.playing });
        handle
            .run_mobile_plugin_async::<serde_json::Value>("update", payload)
            .await
            .map(drop)
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_song_names_and_rejects_oversized_text() {
        assert!(NowPlaying::new("Rainy Window".into(), "Whole library".into(), true).is_ok());
        assert!(NowPlaying::new("é".repeat(MAX_TEXT_CHARS), String::new(), false).is_ok());
        assert!(NowPlaying::new("a".repeat(MAX_TEXT_CHARS + 1), String::new(), false).is_err());
        assert!(NowPlaying::new(String::new(), "a".repeat(MAX_TEXT_CHARS + 1), false).is_err());
    }
}
