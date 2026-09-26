import { create } from "zustand";
import type { Chord, EngineParams, Pattern, TrackId } from "@/audio";
import { DEFAULT_PARAMS } from "@/songs/params";
import { randomize, type RandomizeKind } from "@/songs/randomize";
import type { Song, SongParams } from "@/songs/types";
import { DEFAULT_PANELS, type PanelId } from "./config";

type Section = "keys" | "bass" | "drums" | "pad" | "lead" | "fx" | "ambience";
type Global = Pick<EngineParams, "bpm" | "swing" | "humanize" | "volume">;

/** What is saved of the studio between sessions. */
export interface StudioSnapshot {
  params: EngineParams;
  songId: string | null;
  dirty: boolean;
  panels: Record<PanelId, boolean>;
}

/** What is kept to undo a randomization. */
interface Backup {
  params: EngineParams;
  dirty: boolean;
}

const MAX_HISTORY = 5;

interface StudioState extends StudioSnapshot {
  playing: boolean;
  /** True while the audio engine is starting (the first play builds the whole graph). */
  starting: boolean;
  /** Step being played, `-1` when stopped. */
  step: number;
  /** Bar (chord) being played, `-1` when stopped. */
  bar: number;
  error: string | null;
  /** The sound before the last randomizations, newest last. Not persisted. */
  history: Backup[];

  /** Makes a song the current sound. The listener's volume is kept. */
  loadSong: (song: Song) => void;
  /** Tells the studio the current sound is now stored as `songId` (after a save). */
  markSaved: (songId: string) => void;
  /** Randomizes part of the sound (see `RandomizeKind`); the previous sound can be restored. */
  randomize: (kind: RandomizeKind) => void;
  undoRandomize: () => void;
  setGlobal: (patch: Partial<Global>) => void;
  setSection: <K extends Section>(section: K, patch: Partial<EngineParams[K]>) => void;
  toggleStep: (track: TrackId, index: number) => void;
  setPattern: (pattern: Pattern) => void;
  setProgression: (progression: Chord[]) => void;
  setPanel: (panel: PanelId, open: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setStarting: (starting: boolean) => void;
  setStep: (step: number, bar: number) => void;
  setError: (error: string | null) => void;
  hydrate: (snapshot: StudioSnapshot) => void;
}

export const useStudio = create<StudioState>()((set) => {
  /** Every hand edit of the sound goes through here: it marks the current song as modified. */
  const edit = (change: (params: EngineParams) => EngineParams) =>
    set((s) => ({ params: change(s.params), dirty: true }));

  return {
    params: DEFAULT_PARAMS,
    songId: null,
    dirty: false,
    panels: DEFAULT_PANELS,
    playing: false,
    starting: false,
    step: -1,
    bar: -1,
    error: null,
    history: [],

    loadSong: (song) => set((s) => ({ params: { ...song.params, volume: s.params.volume }, songId: song.id, dirty: false, history: [] })),
    markSaved: (songId) => set({ songId, dirty: false }),

    randomize: (kind) =>
      set((s) => ({
        params: randomize(kind, s.params),
        dirty: true,
        history: [...s.history, { params: s.params, dirty: s.dirty }].slice(-MAX_HISTORY),
      })),
    undoRandomize: () =>
      set((s) => {
        const previous = s.history.at(-1);
        if (!previous) return s;
        // The volume belongs to the listener: undoing must not move it.
        return {
          params: { ...previous.params, volume: s.params.volume },
          dirty: previous.dirty,
          history: s.history.slice(0, -1),
        };
      }),
    setGlobal: (patch) => edit((p) => ({ ...p, ...patch })),
    setSection: (section, patch) => edit((p) => ({ ...p, [section]: { ...p[section], ...patch } })),
    toggleStep: (track, index) =>
      edit((p) => ({
        ...p,
        pattern: { ...p.pattern, [track]: p.pattern[track].map((on, i) => (i === index ? !on : on)) },
      })),

    setPattern: (pattern) => edit((p) => ({ ...p, pattern })),
    setProgression: (progression) => edit((p) => ({ ...p, progression })),

    setPanel: (panel, open) => set((s) => ({ panels: { ...s.panels, [panel]: open } })),
    setPlaying: (playing) => set(playing ? { playing } : { playing, step: -1, bar: -1 }),
    setStarting: (starting) => set({ starting }),
    setStep: (step, bar) => set({ step, bar }),
    setError: (error) => set({ error }),
    hydrate: (snapshot) => set(snapshot),
  };
});

/** The current sound as a song's params (everything but the volume). */
export function currentSongParams(params: EngineParams): SongParams {
  const { volume: _volume, ...rest } = params;
  return rest;
}
