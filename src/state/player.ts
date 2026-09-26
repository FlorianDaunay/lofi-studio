import { create } from "zustand";
import { REPEAT_MODES, type PlaySource, type RepeatMode } from "@/songs/playback";
import { isRecord } from "@/songs/sanitize";

/** How songs follow one another. Saved between sessions (except the shuffle order). */
export interface PlayerPrefs {
  source: PlaySource;
  shuffle: boolean;
  repeat: RepeatMode;
}

interface PlayerState extends PlayerPrefs {
  /** Play order used while `shuffle` is on. Not persisted: a new one is drawn when needed. */
  order: string[];
  set: (patch: Partial<PlayerState>) => void;
}

export const DEFAULT_PLAYER: PlayerPrefs = { source: { kind: "library" }, shuffle: false, repeat: "all" };

export const usePlayer = create<PlayerState>()((set) => ({
  ...DEFAULT_PLAYER,
  order: [],
  set: (patch) => set(patch),
}));

export function sanitizePlayer(raw: unknown): PlayerPrefs {
  const r = isRecord(raw) ? raw : {};
  const source = isRecord(r.source) ? r.source : {};
  const playlistId = typeof source.id === "string" && source.id.length > 0 && source.id.length <= 64 ? source.id : null;
  return {
    source: source.kind === "playlist" && playlistId ? { kind: "playlist", id: playlistId } : DEFAULT_PLAYER.source,
    shuffle: r.shuffle === true,
    repeat: REPEAT_MODES.find((mode) => mode === r.repeat) ?? DEFAULT_PLAYER.repeat,
  };
}
