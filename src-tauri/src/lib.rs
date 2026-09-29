mod config;
mod files;
mod media;
#[cfg(windows)]
mod smtc;
#[cfg(desktop)]
mod tray;
#[cfg(desktop)]
mod window;

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Only the app's own pages may load in the window: no navigation to remote sites.
fn is_internal(url: &tauri::Url) -> bool {
    matches!(url.scheme(), "tauri" | "asset")
        || matches!(url.host_str(), Some("localhost" | "tauri.localhost" | "127.0.0.1"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // First, so a second launch is caught before anything else starts: it shows the running app instead.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| window::show(app)))
        .manage(window::WindowState::default());
    #[cfg(target_os = "android")]
    let builder = builder.plugin(media::plugin());

    let builder = builder
        .plugin(tauri_plugin_dialog::init())
        // For the Rust side of `files.rs` only (Android content URIs); the webview gets no fs permission.
        .plugin(tauri_plugin_fs::init())
        .manage(media::NowPlayingState::default())
        .invoke_handler(tauri::generate_handler![
            config::load_config,
            config::save_config,
            files::save_text_file,
            files::open_text_file,
            media::set_now_playing,
            #[cfg(desktop)]
            window::set_window_mode,
            #[cfg(desktop)]
            window::hide_window
        ])
        .setup(|app| {
            // The window is built here (not in tauri.conf.json) so navigation can be restricted.
            let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default()).on_navigation(is_internal);
            // Size, title, the mini player and the tray only exist on the desktop; a phone shows the app full screen.
            #[cfg(desktop)]
            let builder = {
                tray::create(app.handle())?;
                window::configure(builder)
            };
            let _window = builder.build()?;
            #[cfg(windows)]
            smtc::attach(&_window);
            Ok(())
        });
    #[cfg(desktop)]
    let builder = builder.on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            window::on_close_requested(window, api);
        }
    });

    builder
        .run(tauri::generate_context!())
        .expect("error while running Lofi Studio");
}
