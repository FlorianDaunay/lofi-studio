mod config;
mod files;

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Only the app's own pages may load in the window: no navigation to remote sites.
fn is_internal(url: &tauri::Url) -> bool {
    matches!(url.scheme(), "tauri" | "asset")
        || matches!(url.host_str(), Some("localhost" | "tauri.localhost" | "127.0.0.1"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        // For the Rust side of `files.rs` only (Android content URIs); the webview gets no fs permission.
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            config::load_config,
            config::save_config,
            files::save_text_file,
            files::open_text_file
        ])
        .setup(|app| {
            // The window is built here (not in tauri.conf.json) so navigation can be restricted.
            let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default()).on_navigation(is_internal);
            // Size, title and drag-and-drop only exist on the desktop; a phone shows the app full screen.
            #[cfg(desktop)]
            let builder = builder
                .title("Lofi Studio")
                .inner_size(1000.0, 760.0)
                .min_inner_size(640.0, 560.0)
                .center()
                .disable_drag_drop_handler();
            builder.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Lofi Studio");
}
