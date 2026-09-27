//! The tray icon, next to the clock: what is playing, play / pause, previous / next, the window, quit.
//!
//! The music runs in the page, so the playback items only relay a `media-action` event to it; the
//! page answers with `set_now_playing`, which updates the menu.

use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

use crate::{
    media::NowPlaying,
    window::{self, Mode, MAIN},
};

const TRAY_ID: &str = "main";

/// The menu items whose text follows the music.
struct Items<R: Runtime> {
    title: MenuItem<R>,
    toggle: MenuItem<R>,
}

pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let item = |id: &str, text: &str, enabled: bool| MenuItem::with_id(app, id, text, enabled, None::<&str>);
    let title = item("title", "Lofi Studio", false)?;
    let toggle = item("toggle", "Play", true)?;
    let menu = Menu::with_items(
        app,
        &[
            &title,
            &PredefinedMenuItem::separator(app)?,
            &toggle,
            &item("previous", "Previous song", true)?,
            &item("next", "Next song", true)?,
            &PredefinedMenuItem::separator(app)?,
            &item("open", "Open Lofi Studio", true)?,
            &item("mini", "Mini player", true)?,
            &PredefinedMenuItem::separator(app)?,
            &item("quit", "Quit", true)?,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Lofi Studio")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu_event)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                window::show(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    app.manage(Items { title, toggle });
    Ok(())
}

pub fn show_now_playing<R: Runtime>(app: &AppHandle<R>, now: &NowPlaying) {
    if let Some(items) = app.try_state::<Items<R>>() {
        let _ = items.title.set_text(menu_text(&now.title));
        let _ = items.toggle.set_text(if now.playing { "Pause" } else { "Play" });
    }
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let state = if now.playing { "Playing" } else { "Paused" };
        let _ = tray.set_tooltip(Some(format!("Lofi Studio\n{state}: {} ({})", now.title, now.subtitle)));
    }
}

fn on_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    let result = match event.id().as_ref() {
        action @ ("toggle" | "previous" | "next") => app.emit_to(MAIN, "media-action", action),
        "open" => window::set_mode(app, Mode::Full),
        "mini" => window::set_mode(app, Mode::Mini),
        "quit" => {
            app.exit(0);
            Ok(())
        }
        _ => Ok(()),
    };
    if let Err(error) = result {
        eprintln!("tray menu: {error}");
    }
}

/// Menus read `&` as a keyboard-shortcut marker; a song called "Rain & Tea" must show its `&`.
fn menu_text(text: &str) -> String {
    text.replace('&', "&&")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_ampersands_visible_in_menus() {
        assert_eq!(menu_text("Rain & Tea"), "Rain && Tea");
        assert_eq!(menu_text("Night Drive"), "Night Drive");
    }
}
