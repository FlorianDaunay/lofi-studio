fn main() {
    // `media` is the app's own Android plugin (MediaPlugin.kt): the page listens to the notification's buttons through it.
    let media = tauri_build::InlinedPlugin::new()
        .commands(&["register_listener", "remove_listener"])
        .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands);
    tauri_build::try_build(tauri_build::Attributes::new().plugin("media", media)).expect("failed to run the Tauri build script");
}
