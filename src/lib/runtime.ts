/** True inside the Tauri desktop shell, false in a plain browser (`npm run dev`). */
export const isTauri = "__TAURI_INTERNALS__" in window;
