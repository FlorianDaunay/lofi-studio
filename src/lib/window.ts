import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isDesktopApp } from "./runtime";
import { cleanupWhenReady } from "./utils";

/**
 * The desktop window: full app or mini player, and hiding it in the tray. The Rust side owns the
 * window (size, position, always-on-top) and announces every change, including the ones made from
 * the tray menu, with a `window-mode` event.
 */

export type WindowMode = "full" | "mini";

export async function setWindowMode(mode: WindowMode): Promise<void> {
  if (isDesktopApp) await invoke("set_window_mode", { mode });
}

/** Hides the window; the tray icon brings it back. */
export async function hideToTray(): Promise<void> {
  if (isDesktopApp) await invoke("hide_window");
}

/** Returns a cleanup function. */
export function onWindowModeChange(handler: (mode: WindowMode) => void): () => void {
  if (!isDesktopApp) return () => {};
  return cleanupWhenReady(
    listen<unknown>("window-mode", (event) => {
      if (event.payload === "full" || event.payload === "mini") handler(event.payload);
    }),
  );
}
