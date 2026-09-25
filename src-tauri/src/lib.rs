mod config;

use tauri::{WebviewUrl, WebviewWindowBuilder};

/// Only the app's own pages may load in the window: no navigation to remote sites.
fn is_internal(url: &tauri::Url) -> bool {
    matches!(url.scheme(), "tauri" | "asset")
        || matches!(url.host_str(), Some("localhost" | "tauri.localhost" | "127.0.0.1"))
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![config::load_config, config::save_config])
        .setup(|app| {
            // The window is built here (not in tauri.conf.json) so navigation can be restricted.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Lofi Studio")
                .inner_size(1000.0, 760.0)
                .min_inner_size(640.0, 560.0)
                .center()
                .disable_drag_drop_handler()
                .on_navigation(is_internal)
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Lofi Studio");
}
