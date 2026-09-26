import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./runtime";

/**
 * Save / open a text file through the OS file dialogs.
 * In the desktop app the dialog and the file access happen in Rust (the frontend never chooses a
 * path); in a browser it falls back to a download and a file input.
 */

/** Returns false if the user cancelled. */
export async function saveTextFile(defaultName: string, contents: string): Promise<boolean> {
  if (isTauri) return invoke<boolean>("save_text_file", { defaultName, contents });

  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: defaultName });
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Returns null if the user cancelled. */
export async function openTextFile(): Promise<string | null> {
  if (isTauri) return invoke<string | null>("open_text_file");

  return new Promise((resolve) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
    input.addEventListener("cancel", () => resolve(null));
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      resolve(file ? file.text() : null);
    });
    input.click();
  });
}
