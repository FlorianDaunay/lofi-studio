import { create } from "zustand";
import type { EngineParams, TrackId } from "@/audio";
import { generatePattern } from "@/songs/generate";
import { DEFAULT_PARAMS } from "@/songs/params";
import type { Song, SongParams } from "@/songs/types";
import { DEFAULT_PANELS, type PanelId } from "./config";

type Section = "keys" | "bass" | "drums" | "fx" | "ambience";
type Global = Pick<EngineParams, "bpm" | "swing" | "humanize" | "volume">;

/** What is saved of the studio between sessions. */
export interface StudioSnapshot {
  params: EngineParams;
  songId: string | null;
  dirty: boolean;
  panels: Record<PanelId, boolean>;
}

interface StudioState extends StudioSnapshot {
  playing: boolean;
  /** True while the audio engine is starting (the first play builds the whole graph). */
  starting: boolean;
  /** Step being played, `-1` when stopped. */
  step: number;
  error: string | null;

  /** Makes a song the current sound. The listener's volume is kept. */
  loadSong: (song: Song) => void;
  /** Tells the studio the current sound is now stored as `songId` (after a save). */
  markSaved: (songId: string) => void;
  regenerate: () => void;
  setGlobal: (patch: Partial<Global>) => void;
  setSection: <K extends Section>(section: K, patch: Partial<EngineParams[K]>) => void;
  toggleStep: (track: TrackId, index: number) => void;
  setPanel: (panel: PanelId, open: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setStarting: (starting: boolean) => void;
  setStep: (step: number) => void;
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
    error: null,

    loadSong: (song) => set((s) => ({ params: { ...song.params, volume: s.params.volume }, songId: song.id, dirty: false })),
    markSaved: (songId) => set({ songId, dirty: false }),

    regenerate: () => edit((p) => ({ ...p, pattern: generatePattern() })),
    setGlobal: (patch) => edit((p) => ({ ...p, ...patch })),
    setSection: (section, patch) => edit((p) => ({ ...p, [section]: { ...p[section], ...patch } })),
    toggleStep: (track, index) =>
      edit((p) => ({
        ...p,
        pattern: { ...p.pattern, [track]: p.pattern[track].map((on, i) => (i === index ? !on : on)) },
      })),

    setPanel: (panel, open) => set((s) => ({ panels: { ...s.panels, [panel]: open } })),
    setPlaying: (playing) => set(playing ? { playing } : { playing, step: -1 }),
    setStarting: (starting) => set({ starting }),
    setStep: (step) => set({ step }),
    setError: (error) => set({ error }),
    hydrate: (snapshot) => set(snapshot),
  };
});

/** The current sound as a song's params (everything but the volume). */
export function currentSongParams(params: EngineParams): SongParams {
  const { volume: _volume, ...rest } = params;
  return rest;
}
