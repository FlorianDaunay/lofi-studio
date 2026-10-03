/** True inside the Tauri shell (desktop or Android), false in a plain browser (`npm run dev`). */
export const isTauri = "__TAURI_INTERNALS__" in window;

/** Phones and tablets: less CPU for audio, and a touch screen. */
export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** The desktop app: a window that can shrink to a mini player and hide in the tray. */
export const isDesktopApp = isTauri && !isMobile;

/** The Android app: a media notification and a lock-screen player. */
export const isMobileApp = isTauri && isMobile;
