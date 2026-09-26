import { STEPS } from "@/audio/types";
import {
  buildQueue,
  loopsFor,
  nextInQueue,
  previousInQueue,
  shuffleOrder,
  type PlaySource,
  type RepeatMode,
} from "@/songs/playback";
import type { Song } from "@/songs/types";
import { engine, togglePlay } from "./bridge";
import { allSongs, findPlaylist, findSong, useLibrary } from "./library";
import { usePlayer } from "./player";
import { useStudio } from "./studio";

/**
 * What to play next: the queue (library or playlist, in order or shuffled), repeat, and moving
 * between songs. Lives outside the stores because it reads the studio, the library and the
 * player together.
 */

/** Ids of the songs the current source offers, in their natural order. */
function sourceIds(source: PlaySource): string[] {
  const { songs, playlists } = useLibrary.getState();
  if (source.kind === "playlist") {
    const playlist = findPlaylist(playlists, source.id);
    // A playlist that no longer exists falls back to the whole library.
    if (playlist) return playlist.songIds;
  }
  return allSongs(songs).map((song) => song.id);
}

const currentQueue = (): string[] => {
  const { source, shuffle, order } = usePlayer.getState();
  return buildQueue(sourceIds(source), shuffle, order);
};

/** Puts a song on the studio; when the engine is running it keeps going, from the top of the loop. */
function switchTo(song: Song) {
  useStudio.getState().loadSong(song);
  engine.restartLoop();
}

function reshuffle(options: { first?: string | null; avoid?: string | null }) {
  const { source } = usePlayer.getState();
  usePlayer.getState().set({ order: shuffleOrder(sourceIds(source), Math.random, options) });
}

/** Moves to another song of the queue. `auto` means the song ended on its own. */
function advance(auto: boolean) {
  const { songId } = useStudio.getState();
  const { shuffle, repeat } = usePlayer.getState();
  const step = nextInQueue(currentQueue(), songId, repeat, auto);
  let id = step.id;
  if (step.wrapped && shuffle && id !== null) {
    // A shuffled queue that wraps gets a fresh order, so every lap is different.
    reshuffle({ avoid: songId });
    id = currentQueue()[0] ?? null;
  }
  if (id === null) {
    void engine.stop();
    return;
  }
  if (id === songId) return; // repeat-one: the loop simply carries on
  const song = findSong(useLibrary.getState().songs, id);
  if (song) switchTo(song);
}

export const playNext = () => advance(false);

export function playPrevious() {
  const { songId } = useStudio.getState();
  const id = previousInQueue(currentQueue(), songId, usePlayer.getState().repeat);
  const song = id === null ? undefined : findSong(useLibrary.getState().songs, id);
  if (song) switchTo(song);
}

export function setShuffle(shuffle: boolean) {
  usePlayer.getState().set({ shuffle });
  // The song that is playing stays first, the rest is drawn.
  if (shuffle) reshuffle({ first: useStudio.getState().songId });
}

export const setRepeat = (repeat: RepeatMode) => usePlayer.getState().set({ repeat });

export function setSource(source: PlaySource) {
  usePlayer.getState().set({ source });
  if (usePlayer.getState().shuffle) reshuffle({ first: useStudio.getState().songId });
}

/** Chooses a source and plays it from its first song (a random one when shuffle is on). */
export async function playSource(source: PlaySource, startWith?: string) {
  setSource(source);
  if (usePlayer.getState().shuffle) reshuffle({ first: startWith ?? null });
  const id = startWith ?? currentQueue()[0];
  const song = id === undefined ? undefined : findSong(useLibrary.getState().songs, id);
  if (!song) return;
  switchTo(song);
  if (!useStudio.getState().playing) await togglePlay();
}

/**
 * Moves to the next song when the current one has played long enough. Never while the sound has
 * unsaved edits or is not a saved song: that would throw the user's work away.
 * Returns a cleanup function, like `startBridge`.
 */
export function startPlayback(): () => void {
  let loops = 0;
  return useStudio.subscribe((state, prev) => {
    if (!state.playing || state.songId !== prev.songId) loops = 0;
    if (!state.playing || state.step === prev.step) return;
    const lastBar = state.params.progression.length - 1;
    if (state.step !== STEPS - 1 || state.bar !== lastBar) return;
    loops++;
    if (loops < loopsFor(state.params) || state.dirty || state.songId === null) return;
    loops = 0;
    advance(true);
  });
}
