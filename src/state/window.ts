import { create } from "zustand";
import { onWindowModeChange, type WindowMode } from "@/lib/window";

/** Desktop only: whether the window shows the whole app or the mini player. Not persisted. */
export const useWindowMode = create<{ mode: WindowMode }>()(() => ({ mode: "full" }));

/** Follows the mode the Rust side applied (from the app or the tray). Returns a cleanup function. */
export const startWindowSync = (): (() => void) => onWindowModeChange((mode) => useWindowMode.setState({ mode }));
