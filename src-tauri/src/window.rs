//! The main window on the desktop: the full app or a mini player, hiding in the tray, and closing.
//!
//! Closing the window while music plays hides it (the tray icon brings it back, its menu quits);
//! closing it while nothing plays quits, so an idle app never lingers in the background.
//! Every mode change is announced to the page with a `window-mode` event, whoever asked for it.

use std::sync::Mutex;
use tauri::{
    AppHandle, CloseRequestApi, Emitter, LogicalSize, Manager, PhysicalPosition, PhysicalSize, Runtime, WebviewWindow,
    WebviewWindowBuilder, Window,
};

use crate::media;

pub const MAIN: &str = "main";

const FULL_SIZE: LogicalSize<f64> = LogicalSize::new(1000.0, 760.0);
const FULL_MIN_SIZE: LogicalSize<f64> = LogicalSize::new(640.0, 560.0);
const MINI_SIZE: LogicalSize<f64> = LogicalSize::new(400.0, 88.0);
/// Distance of a new mini player from the corner of the screen.
const MINI_MARGIN: f64 = 16.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Full,
    Mini,
}

impl Mode {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "full" => Ok(Self::Full),
            "mini" => Ok(Self::Mini),
            _ => Err(format!("unknown window mode: {value}")),
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Mini => "mini",
        }
    }
}

/// Where the full window was, to put it back as it was.
struct Placement {
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    maximized: bool,
}

struct Layout {
    mode: Mode,
    full: Option<Placement>,
    /// Where the user last left the mini player.
    mini: Option<PhysicalPosition<i32>>,
}

pub struct WindowState(Mutex<Layout>);

impl Default for WindowState {
    fn default() -> Self {
        Self(Mutex::new(Layout { mode: Mode::Full, full: None, mini: None }))
    }
}

/// The desktop look of the main window (a phone shows it full screen).
pub fn configure<'a, R: Runtime, M: Manager<R>>(builder: WebviewWindowBuilder<'a, R, M>) -> WebviewWindowBuilder<'a, R, M> {
    builder
        .title("Lofi Studio")
        .inner_size(FULL_SIZE.width, FULL_SIZE.height)
        .min_inner_size(FULL_MIN_SIZE.width, FULL_MIN_SIZE.height)
        .center()
        .disable_drag_drop_handler()
}

#[tauri::command]
pub fn set_window_mode<R: Runtime>(app: AppHandle<R>, mode: String) -> Result<(), String> {
    set_mode(&app, Mode::parse(&mode)?).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hide_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    main_window(&app)?.hide().map_err(|e| e.to_string())
}

/// Brings the window back as it was (full or mini), e.g. from the tray icon or a second launch.
pub fn show<R: Runtime>(app: &AppHandle<R>) {
    if let Ok(window) = main_window(app) {
        let _ = window.unminimize().and_then(|()| window.show()).and_then(|()| window.set_focus());
    }
}

/// Switches the window to `mode` and shows it.
pub fn set_mode<R: Runtime>(app: &AppHandle<R>, mode: Mode) -> tauri::Result<()> {
    let window = main_window(app).map_err(|_| tauri::Error::WindowNotFound)?;
    let state = app.state::<WindowState>();
    let mut layout = state.0.lock().unwrap_or_else(|e| e.into_inner());
    if layout.mode != mode {
        match mode {
            Mode::Mini => {
                layout.full = Some(Placement {
                    position: window.outer_position()?,
                    size: window.inner_size()?,
                    maximized: window.is_maximized()?,
                });
                enter_mini(&window, layout.mini)?;
            }
            Mode::Full => {
                layout.mini = Some(window.outer_position()?);
                leave_mini(&window, layout.full.take())?;
            }
        }
        layout.mode = mode;
    }
    drop(layout);
    window.unminimize()?;
    window.show()?;
    window.set_focus()?;
    window.emit_to(MAIN, "window-mode", mode.as_str())
}

/// Closing hides the window while music plays, so it goes on in the tray.
pub fn on_close_requested<R: Runtime>(window: &Window<R>, api: &CloseRequestApi) {
    if window.label() == MAIN && media::is_playing(window.app_handle()) {
        api.prevent_close();
        let _ = window.hide();
    }
}

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Result<WebviewWindow<R>, String> {
    app.get_webview_window(MAIN).ok_or_else(|| "the main window is gone".into())
}

fn enter_mini<R: Runtime>(window: &WebviewWindow<R>, last: Option<PhysicalPosition<i32>>) -> tauri::Result<()> {
    if window.is_maximized()? {
        window.unmaximize()?;
    }
    window.set_decorations(false)?;
    window.set_min_size(None::<LogicalSize<f64>>)?;
    window.set_resizable(false)?;
    window.set_size(MINI_SIZE)?;
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    // Where the user left it last time, else the bottom-right corner, above the taskbar.
    let position = match (last, window.current_monitor()?) {
        (Some(position), _) => Some(position),
        (None, Some(monitor)) => {
            let area = monitor.work_area();
            let size = MINI_SIZE.to_physical::<i32>(monitor.scale_factor());
            let margin = (MINI_MARGIN * monitor.scale_factor()) as i32;
            Some(PhysicalPosition::new(
                area.position.x + area.size.width as i32 - size.width - margin,
                area.position.y + area.size.height as i32 - size.height - margin,
            ))
        }
        (None, None) => None,
    };
    if let Some(position) = position {
        window.set_position(position)?;
    }
    Ok(())
}

fn leave_mini<R: Runtime>(window: &WebviewWindow<R>, full: Option<Placement>) -> tauri::Result<()> {
    window.set_always_on_top(false)?;
    window.set_skip_taskbar(false)?;
    window.set_decorations(true)?;
    window.set_resizable(true)?;
    window.set_min_size(Some(FULL_MIN_SIZE))?;
    match full {
        Some(Placement { position, size, maximized }) => {
            window.set_size(size)?;
            window.set_position(position)?;
            if maximized {
                window.maximize()?;
            }
        }
        None => {
            window.set_size(FULL_SIZE)?;
            window.center()?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_the_modes_the_page_sends() {
        for mode in [Mode::Full, Mode::Mini] {
            assert_eq!(Mode::parse(mode.as_str()), Ok(mode));
        }
        assert!(Mode::parse("fullscreen").is_err());
    }
}
