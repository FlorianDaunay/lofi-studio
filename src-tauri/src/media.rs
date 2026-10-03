//! What is playing, as the page reports it. The system's media controls show it (the tray menu on
//! the desktop, plus the media keys and flyout on Windows, the notification and lock screen on
//! Android), and on the desktop it decides what closing the window does: hide to the tray while
//! music plays, quit otherwise.
//!
//! On Android, "playing" is also what keeps the app alive in the background: the Kotlin side holds
//! a foreground service only while it is true, so an idle app gets no background task.

use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};

/// Song and playlist names are short; this only rejects nonsense from a compromised page.
const MAX_TEXT_CHARS: usize = 200;
/// A 320 x 320 PNG cover is well under this once in base64.
const MAX_ARTWORK_CHARS: usize = 700_000;
/// Songs last minutes; a day is already absurd.
const MAX_SECONDS: f64 = 86_400.0;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct NowPlaying {
    pub title: String,
    pub subtitle: String,
    pub playing: bool,
    /// Length of the song and position in it, in seconds (the progress bar).
    pub duration: f64,
    pub position: f64,
    /// The theme's accent, `0xRRGGBB`.
    pub accent: Option<u32>,
}

impl NowPlaying {
    fn new(title: String, subtitle: String, playing: bool, duration: f64, position: f64, accent: Option<u32>) -> Result<Self, String> {
        for text in [&title, &subtitle] {
            if text.chars().count() > MAX_TEXT_CHARS {
                return Err("now-playing text is too long".into());
            }
        }
        for seconds in [duration, position] {
            if !seconds.is_finite() || !(0.0..=MAX_SECONDS).contains(&seconds) {
                return Err("now-playing time is out of range".into());
            }
        }
        if accent.is_some_and(|color| color > 0xFF_FFFF) {
            return Err("now-playing accent is not a color".into());
        }
        Ok(Self { title, subtitle, playing, duration, position: position.min(duration), accent })
    }
}

/// The cover, as a base64 PNG: checked for size and alphabet, then handed on as is.
fn check_artwork(artwork: &str) -> Result<(), String> {
    if artwork.len() > MAX_ARTWORK_CHARS {
        return Err("artwork is too large".into());
    }
    if !artwork.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'+' | b'/' | b'=')) {
        return Err("artwork is not base64".into());
    }
    Ok(())
}

#[derive(Default)]
pub struct NowPlayingState(Mutex<NowPlaying>);

#[cfg(desktop)]
pub fn is_playing<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.try_state::<NowPlayingState>()
        .is_some_and(|state| state.0.lock().unwrap_or_else(|e| e.into_inner()).playing)
}

/// `duration`, `position` and `accent` are optional so a page from an older build still works;
/// `artwork` is only sent when the cover changed.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn set_now_playing<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    subtitle: String,
    playing: bool,
    duration: Option<f64>,
    position: Option<f64>,
    accent: Option<u32>,
    artwork: Option<String>,
) -> Result<(), String> {
    let now = NowPlaying::new(title, subtitle, playing, duration.unwrap_or(0.0), position.unwrap_or(0.0), accent)?;
    if let Some(artwork) = &artwork {
        check_artwork(artwork)?;
    }
    *app.state::<NowPlayingState>().0.lock().unwrap_or_else(|e| e.into_inner()) = now.clone();
    #[cfg(desktop)]
    crate::tray::show_now_playing(&app, &now);
    #[cfg(windows)]
    crate::smtc::show_now_playing(&app, &now);
    #[cfg(target_os = "macos")]
    crate::now_playing_mac::show_now_playing(&app, &now);
    #[cfg(target_os = "android")]
    android::show_now_playing(&app, &now, artwork).await?;
    #[cfg(not(target_os = "android"))]
    drop(artwork);
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

    pub async fn show_now_playing<R: Runtime>(app: &AppHandle<R>, now: &NowPlaying, artwork: Option<String>) -> Result<(), String> {
        let handle = app.state::<Handle<R>>().0.clone();
        let mut payload = serde_json::json!({
            "title": now.title,
            "subtitle": now.subtitle,
            "playing": now.playing,
            "durationMs": (now.duration * 1000.0).round() as i64,
            "positionMs": (now.position * 1000.0).round() as i64,
        });
        if let Some(accent) = now.accent {
            payload["accent"] = accent.into();
        }
        if let Some(artwork) = artwork {
            payload["artwork"] = artwork.into();
        }
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

    fn now(title: &str, subtitle: &str) -> Result<NowPlaying, String> {
        NowPlaying::new(title.into(), subtitle.into(), true, 120.0, 30.0, Some(0x33_66_99))
    }

    #[test]
    fn accepts_song_names_and_rejects_oversized_text() {
        assert!(now("Rainy Window", "Whole library").is_ok());
        assert!(now(&"é".repeat(MAX_TEXT_CHARS), "").is_ok());
        assert!(now(&"a".repeat(MAX_TEXT_CHARS + 1), "").is_err());
        assert!(now("", &"a".repeat(MAX_TEXT_CHARS + 1)).is_err());
    }

    #[test]
    fn checks_times_and_colors() {
        let make = |duration: f64, position: f64, accent: Option<u32>| NowPlaying::new(String::new(), String::new(), false, duration, position, accent);
        assert!(make(f64::NAN, 0.0, None).is_err());
        assert!(make(120.0, -1.0, None).is_err());
        assert!(make(MAX_SECONDS + 1.0, 0.0, None).is_err());
        assert!(make(120.0, 0.0, Some(0x1_00_00_00)).is_err());
        // A song with unsaved edits loops on: the position never shows past the end.
        assert_eq!(make(120.0, 150.0, None).map(|n| n.position), Ok(120.0));
    }

    #[test]
    fn accepts_base64_artwork_only() {
        assert!(check_artwork("iVBORw0KGgo+/=").is_ok());
        assert!(check_artwork("not base64!").is_err());
        assert!(check_artwork(&"A".repeat(MAX_ARTWORK_CHARS + 1)).is_err());
    }
}
