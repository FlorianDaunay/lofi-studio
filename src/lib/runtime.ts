/** True inside the Tauri desktop shell, false in a plain browser (`npm run dev`). */
export const isTauri = "__TAURI_INTERNALS__" in window;

/** Phones and tablets: less CPU for audio, and a touch screen. */
export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
