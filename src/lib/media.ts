import { addPluginListener, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isMobile, isTauri } from "./runtime";
import { cleanupWhenReady } from "./utils";

/**
 * The system's media controls: the tray icon on the desktop, the notification (and lock screen,
 * headset buttons) on Android. The page tells the shell what is playing; the shell sends back
 * what the user pressed. In a plain browser both ends are no-ops.
 */

export const MEDIA_ACTIONS = ["play", "pause", "toggle", "next", "previous"] as const;
export type MediaAction = (typeof MEDIA_ACTIONS)[number];

export interface NowPlaying {
  title: string;
  subtitle: string;
  playing: boolean;
}

const isMediaAction = (value: unknown): value is MediaAction => MEDIA_ACTIONS.includes(value as MediaAction);

export async function publishNowPlaying(nowPlaying: NowPlaying): Promise<void> {
  if (isTauri) await invoke("set_now_playing", { ...nowPlaying });
}

/** Calls `handler` for each button pressed outside the page. Returns a cleanup function. */
export function onMediaAction(handler: (action: MediaAction) => void): () => void {
  if (!isTauri) return () => {};
  const accept = (action: unknown) => {
    if (isMediaAction(action)) handler(action);
  };
  // Desktop: the tray menu (Rust) emits an event. Android: the notification talks to a Kotlin plugin.
  if (isMobile) {
    return cleanupWhenReady(
      addPluginListener<{ action?: unknown }>("media", "action", (payload) => accept(payload.action)).then(
        (listener) => () => void listener.unregister(),
      ),
    );
  }
  return cleanupWhenReady(listen<unknown>("media-action", (event) => accept(event.payload)));
}
