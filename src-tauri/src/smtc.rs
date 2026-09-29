//! Windows' media controls (System Media Transport Controls): the play / pause, next and previous
//! keys of keyboards, the buttons of headphones (wired or Bluetooth), and the media flyout next to
//! the volume. They reach the app wherever its window is (focused, behind others, in the tray).
//!
//! The music is synthesized in the page with Web Audio, which Windows does not see as media: the
//! controls are registered here, for the window, and relay each button as a `media-action` event,
//! like the tray menu. The page answers with `set_now_playing`, which updates what Windows shows.

use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow};
use windows::{
    core::{factory, Ref, HSTRING},
    Foundation::TypedEventHandler,
    Media::{
        MediaPlaybackStatus, MediaPlaybackType, SystemMediaTransportControls, SystemMediaTransportControlsButton,
        SystemMediaTransportControlsButtonPressedEventArgs,
    },
    Win32::{Foundation::HWND, System::WinRT::ISystemMediaTransportControlsInterop},
};

use crate::{media::NowPlaying, window::MAIN};

struct Controls(SystemMediaTransportControls);

/// What a button asks the page to do, in the vocabulary of `lib/media.ts`.
fn action(button: SystemMediaTransportControlsButton) -> Option<&'static str> {
    match button {
        SystemMediaTransportControlsButton::Play => Some("play"),
        SystemMediaTransportControlsButton::Pause | SystemMediaTransportControlsButton::Stop => Some("pause"),
        SystemMediaTransportControlsButton::Next => Some("next"),
        SystemMediaTransportControlsButton::Previous => Some("previous"),
        _ => None,
    }
}

/// Registers the controls for the main window. A failure only costs the media keys: the app runs on.
pub fn attach<R: Runtime>(window: &WebviewWindow<R>) {
    if let Err(error) = try_attach(window) {
        eprintln!("media keys: {error}");
    }
}

fn try_attach<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    // Tauri may link another `windows` version than this crate: pass the raw handle across.
    let hwnd = HWND(window.hwnd().map_err(|e| e.to_string())?.0);
    let interop = factory::<SystemMediaTransportControls, ISystemMediaTransportControlsInterop>().map_err(|e| e.to_string())?;
    let controls: SystemMediaTransportControls = unsafe { interop.GetForWindow(hwnd) }.map_err(|e| e.to_string())?;

    let setup = || -> windows::core::Result<()> {
        controls.SetIsPlayEnabled(true)?;
        controls.SetIsPauseEnabled(true)?;
        controls.SetIsStopEnabled(true)?;
        controls.SetIsNextEnabled(true)?;
        controls.SetIsPreviousEnabled(true)?;
        controls.SetPlaybackStatus(MediaPlaybackStatus::Stopped)?;
        controls.DisplayUpdater()?.SetType(MediaPlaybackType::Music)?;
        let app = window.app_handle().clone();
        controls.ButtonPressed(&TypedEventHandler::new(
            move |_, args: Ref<'_, SystemMediaTransportControlsButtonPressedEventArgs>| {
                if let Some(action) = action(args.ok()?.Button()?) {
                    if let Err(error) = app.emit_to(MAIN, "media-action", action) {
                        eprintln!("media keys: {error}");
                    }
                }
                Ok(())
            },
        ))?;
        controls.SetIsEnabled(true)
    };
    setup().map_err(|e| e.to_string())?;
    window.app_handle().manage(Controls(controls));
    Ok(())
}

/// Shows the song in the Windows media flyout, and tells Windows whether play / pause means play or pause.
pub fn show_now_playing<R: Runtime>(app: &AppHandle<R>, now: &NowPlaying) {
    let Some(controls) = app.try_state::<Controls>() else { return };
    let update = || -> windows::core::Result<()> {
        let status = if now.playing { MediaPlaybackStatus::Playing } else { MediaPlaybackStatus::Paused };
        controls.0.SetPlaybackStatus(status)?;
        let display = controls.0.DisplayUpdater()?;
        display.SetType(MediaPlaybackType::Music)?;
        let music = display.MusicProperties()?;
        music.SetTitle(&HSTRING::from(now.title.as_str()))?;
        music.SetArtist(&HSTRING::from(now.subtitle.as_str()))?;
        display.Update()
    };
    if let Err(error) = update() {
        eprintln!("media keys: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_buttons_to_page_actions() {
        assert_eq!(action(SystemMediaTransportControlsButton::Play), Some("play"));
        assert_eq!(action(SystemMediaTransportControlsButton::Pause), Some("pause"));
        assert_eq!(action(SystemMediaTransportControlsButton::Stop), Some("pause"));
        assert_eq!(action(SystemMediaTransportControlsButton::Next), Some("next"));
        assert_eq!(action(SystemMediaTransportControlsButton::Previous), Some("previous"));
        assert_eq!(action(SystemMediaTransportControlsButton::Rewind), None);
    }
}
