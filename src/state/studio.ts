import { create } from "zustand";
import type { EngineParams, TrackId } from "@/audio";
import { DEFAULT_PANELS, type PanelId, type PersistedConfig } from "./config";
import { DEFAULT_PARAMS } from "./defaults";
import { generatePattern } from "./generate";
import { findPreset } from "./presets";

type Section = "keys" | "bass" | "drums" | "fx" | "ambience";
type Global = Pick<EngineParams, "bpm" | "swing" | "humanize" | "volume">;

interface StudioState {
  params: EngineParams;
  /** The preset the current sound came from; `null` once anything is edited by hand. */
  presetId: string | null;
  panels: Record<PanelId, boolean>;
  playing: boolean;
  /** True while the audio engine is starting (the first play builds the whole graph). */
  starting: boolean;
  /** Step being played, `-1` when stopped. */
  step: number;
  error: string | null;

  applyPreset: (id: string) => void;
  regenerate: () => void;
  setGlobal: (patch: Partial<Global>) => void;
  setSection: <K extends Section>(section: K, patch: Partial<EngineParams[K]>) => void;
  toggleStep: (track: TrackId, index: number) => void;
  setPanel: (panel: PanelId, open: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setStarting: (starting: boolean) => void;
  setStep: (step: number) => void;
  setError: (error: string | null) => void;
  hydrate: (config: PersistedConfig) => void;
}

export const useStudio = create<StudioState>()((set) => ({
  params: DEFAULT_PARAMS,
  presetId: null,
  panels: DEFAULT_PANELS,
  playing: false,
  starting: false,
  step: -1,
  error: null,

  applyPreset: (id) => {
    const preset = findPreset(id);
    if (!preset) return;
    // The listener's volume survives a preset change.
    set((s) => ({ presetId: id, params: { ...preset.params, volume: s.params.volume } }));
  },

  regenerate: () => set((s) => ({ presetId: null, params: { ...s.params, pattern: generatePattern() } })),

  setGlobal: (patch) => set((s) => ({ presetId: null, params: { ...s.params, ...patch } })),

  setSection: (section, patch) =>
    set((s) => ({ presetId: null, params: { ...s.params, [section]: { ...s.params[section], ...patch } } })),

  toggleStep: (track, index) =>
    set((s) => {
      const row = s.params.pattern[track].map((on, i) => (i === index ? !on : on));
      return { presetId: null, params: { ...s.params, pattern: { ...s.params.pattern, [track]: row } } };
    }),

  setPanel: (panel, open) => set((s) => ({ panels: { ...s.panels, [panel]: open } })),
  setPlaying: (playing) => set(playing ? { playing } : { playing, step: -1 }),
  setStarting: (starting) => set({ starting }),
  setStep: (step) => set({ step }),
  setError: (error) => set({ error }),
  hydrate: (config) => set({ params: config.params, presetId: config.presetId, panels: config.panels }),
}));

export const selectConfig = (s: Pick<StudioState, "params" | "presetId" | "panels">): PersistedConfig => ({
  version: 1,
  params: s.params,
  presetId: s.presetId,
  panels: s.panels,
});
