import {
  AMBIENCE_LAYERS,
  BASS_VOICES,
  DRUM_KITS,
  KEYS_VOICES,
  LEAD_VOICES,
  PAD_VOICES,
  PERC_VOICES,
  type AmbienceLayerId,
} from "@/audio/types";
import type { SoundProfile } from "./insights";
import { DEFAULT_PARAMS, SILENT_AMBIENCE } from "./params";
import { autoLoops } from "./playback";
import { PROGRESSIONS, randomPattern, type Rng } from "./randomize";
import { RANGES, clamp } from "./ranges";
import type { SongDraft, SongParams } from "./types";

/**
 * "Made for you": a new song drawn from the listener's sound profile. Voices are drawn in
 * proportion to how much they were heard (squared, so favorites win most of the time without
 * always winning), tempo and texture stay close to the averages, and the ambience is made of the
 * layers actually listened to. Everything else comes from the same curated lists as "Randomize",
 * so the result always sounds like lo-fi, and it always passes the sanitizer unchanged.
 */

/** The most a generated song strays from the average tempo, in BPM. */
export const TEMPO_SPREAD = 4;
/** Generated songs stay in the range the built-in songs use. */
const TEMPO = { min: 60, max: 96 };
const TRAIT_SPREAD = 0.08;

const round2 = (value: number) => Math.round(value * 100) / 100;
const jitter = (rng: Rng, spread: number) => (rng() * 2 - 1) * spread;
const pickOne = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;

/** A key of `shares` (restricted to `allowed`), with odds growing with the square of its share. */
function pickWeighted<T extends string>(rng: Rng, shares: Record<string, number>, allowed: readonly T[], fallback: T): T {
  const options = allowed.filter((key) => (shares[key] ?? 0) > 0);
  const total = options.reduce((sum, key) => sum + (shares[key] ?? 0) ** 2, 0);
  if (total <= 0) return fallback;
  let roll = rng() * total;
  for (const key of options) {
    roll -= (shares[key] ?? 0) ** 2;
    if (roll < 0) return key;
  }
  return options.at(-1) ?? fallback;
}

/** One or two of the layers that were heard, a little louder or softer than on average. */
function pickAmbience(rng: Rng, heard: SoundProfile["ambience"]): SongParams["ambience"] {
  const ambience = { ...SILENT_AMBIENCE };
  const candidates = AMBIENCE_LAYERS.filter((id) => heard[id] >= 0.03);
  const count = Math.min(candidates.length, rng() < 0.5 ? 1 : 2);
  const shares = Object.fromEntries(candidates.map((id) => [id, heard[id]]));
  for (let i = 0; i < count; i++) {
    const id = pickWeighted<AmbienceLayerId>(rng, shares, candidates, candidates[0]!);
    delete shares[id];
    ambience[id] = round2(clamp(heard[id] * 1.2 + jitter(rng, 0.1), { min: 0.2, max: 0.7 }));
  }
  return ambience;
}

/** Words for the title: a mood from the texture, a place from the ambience. */
const PLACES: Record<AmbienceLayerId, string> = {
  rain: "Rain",
  wind: "Breeze",
  thunder: "Storm",
  waves: "Tide",
  stream: "Creek",
  chimes: "Porch",
  birds: "Morning",
  crickets: "Summer Night",
  frogs: "Pond",
  leaves: "Grove",
  vinyl: "Records",
  fire: "Embers",
  clock: "Study",
  city: "Streets",
  train: "Journey",
};
const QUIET_PLACES = ["Room", "Window", "Hours", "Notes", "Light"];
const CALM_MOODS = ["Quiet", "Soft", "Slow", "Golden", "Late"];

function title(rng: Rng, params: SongParams): string {
  const { fx, swing } = params;
  const moods = [
    ...(fx.tone < 4200 ? ["Hazy"] : []),
    ...(fx.warmth > 0.4 ? ["Warm"] : []),
    ...(fx.reverb > 0.35 ? ["Distant"] : []),
    ...(swing > 0.55 ? ["Swaying"] : []),
    ...(fx.wobble > 0.45 ? ["Worn"] : []),
  ];
  const loudest = AMBIENCE_LAYERS.reduce((a, b) => (params.ambience[b] > params.ambience[a] ? b : a));
  const place = params.ambience[loudest] > 0 ? PLACES[loudest] : pickOne(rng, QUIET_PLACES);
  return `${pickOne(rng, moods.length > 0 ? moods : CALM_MOODS)} ${place}`;
}

/** A new song in the listener's taste. `rng` returns a number in [0, 1), so tests can inject it. */
export function songForProfile(profile: SoundProfile, rng: Rng): SongDraft {
  const base = DEFAULT_PARAMS;
  const { traits, voices } = profile;
  const near = (value: number, range: { min: number; max: number }) => round2(clamp(value + jitter(rng, TRAIT_SPREAD), range));

  const bpm = Math.round(clamp(profile.bpm + jitter(rng, TEMPO_SPREAD), TEMPO));
  const progression = [...pickOne(rng, PROGRESSIONS)];
  const padVoice = pickWeighted(rng, voices.pad, [...PAD_VOICES, "off"], "off");
  const leadVoice = pickWeighted(rng, voices.lead, [...LEAD_VOICES, "off"], "off");
  // The tone slider goes from muffled to bright; generated songs stay in the warm middle of it.
  const tone = Math.round(clamp(RANGES.tone.max - traits.muffle * (RANGES.tone.max - RANGES.tone.min) + jitter(rng, 600), { min: 2500, max: 8000 }) / 50) * 50;

  const params: SongParams = {
    bpm,
    transpose: 0,
    swing: near(traits.swing, RANGES.swing),
    humanize: near(traits.looseness, RANGES.humanize),
    loops: autoLoops({ bpm, progression }),
    pattern: randomPattern(rng),
    progression,
    keys: { ...base.keys, voice: pickWeighted(rng, voices.keys, KEYS_VOICES, base.keys.voice) },
    bass: { ...base.bass, voice: pickWeighted(rng, voices.bass, BASS_VOICES, base.bass.voice) },
    drums: { ...base.drums, kit: pickWeighted(rng, voices.drums, DRUM_KITS, base.drums.kit), percVoice: pickOne(rng, PERC_VOICES) },
    pad: padVoice === "off" ? base.pad : { ...base.pad, voice: padVoice, level: 0.3 },
    lead: leadVoice === "off" ? base.lead : { ...base.lead, voice: leadVoice, level: 0.3 },
    fx: {
      ...base.fx,
      tone,
      wobble: near(traits.wobble, RANGES.amount),
      warmth: near(traits.warmth, RANGES.amount),
      reverb: near(traits.space, RANGES.amount),
    },
    ambience: pickAmbience(rng, profile.ambience),
  };
  return { name: title(rng, params), description: "Made for you, from what you listen to.", params };
}

/** A small seeded generator (mulberry32): the same seed always gives the same song. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
