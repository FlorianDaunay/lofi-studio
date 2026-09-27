import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/**
 * A synchronous cleanup for a listener that registers asynchronously (Tauri's `listen`): if the
 * cleanup runs first (React StrictMode), the listener is removed as soon as it arrives.
 */
export function cleanupWhenReady(pending: Promise<() => void>): () => void {
  let stopped = false;
  let stop: (() => void) | undefined;
  pending.then(
    (unlisten) => (stopped ? unlisten() : (stop = unlisten)),
    (error: unknown) => console.warn("Could not listen to the app shell.", error),
  );
  return () => {
    stopped = true;
    stop?.();
  };
}
