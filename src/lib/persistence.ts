import { invoke } from "@tauri-apps/api/core";
import { sanitizeConfig, type PersistedConfig } from "@/state/config";

/**
 * Configuration lives in a JSON file in the OS app-config directory, written by the Rust side
 * (`load_config` / `save_config`). In a plain browser (`npm run dev`) it falls back to localStorage.
 */
const isTauri = "__TAURI_INTERNALS__" in window;
const LOCAL_KEY = "lofi-studio-config";

export async function loadConfig(): Promise<PersistedConfig | null> {
  try {
    const text = isTauri ? await invoke<string | null>("load_config") : localStorage.getItem(LOCAL_KEY);
    return text ? sanitizeConfig(JSON.parse(text)) : null;
  } catch (error) {
    console.warn("Could not load the saved configuration; using defaults.", error);
    return null;
  }
}

export async function saveConfig(config: PersistedConfig): Promise<void> {
  const text = JSON.stringify(config);
  if (isTauri) await invoke("save_config", { json: text });
  else localStorage.setItem(LOCAL_KEY, text);
}
