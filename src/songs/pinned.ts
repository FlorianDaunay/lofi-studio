import { BUILT_IN_SONGS } from "./builtin";
import { PINNED_SLOTS } from "./types";

/** The four songs pinned on the Studio page until the user chooses others. */
export const DEFAULT_PINNED: string[] = BUILT_IN_SONGS.slice(0, PINNED_SLOTS).map((song) => song.id);

/**
 * Always returns exactly `PINNED_SLOTS` ids that exist in `validIds`. A slot whose song is gone
 * (deleted, or missing from an imported config) takes the first song not already pinned.
 */
export function fillPinned(pinned: readonly unknown[], validIds: readonly string[]): string[] {
  const valid = new Set(validIds);
  const result: string[] = [];
  for (let slot = 0; slot < PINNED_SLOTS; slot++) {
    const wanted = pinned[slot];
    if (typeof wanted === "string" && valid.has(wanted)) {
      result.push(wanted);
      continue;
    }
    const fallback = validIds.find((id) => !result.includes(id) && !pinned.includes(id)) ?? validIds.find((id) => !result.includes(id));
    result.push(fallback ?? BUILT_IN_SONGS[0]!.id);
  }
  return result;
}
