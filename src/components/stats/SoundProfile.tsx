import { useState } from "react";
import { AMBIENCE_LAYERS } from "@/audio";
import { AMBIENCE_LABELS } from "@/components/studio/ambience-labels";
import { BASS_VOICE_OPTIONS, DRUM_KIT_OPTIONS, KEYS_VOICE_OPTIONS } from "@/components/studio/instrument-labels";
import { formatSpent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SOUND_TRAITS, TEMPO_BAND, ranked, type SoundProfile as Profile, type SoundTrait } from "@/songs/insights";
import { RANGES } from "@/songs/ranges";
import { ChartTooltip } from "./ChartTooltip";
import { StatCard } from "./StatCard";
import { useWidth } from "./use-width";

const TRAIT_LABELS: Record<SoundTrait, string> = {
  swing: "Swing",
  looseness: "Looseness",
  warmth: "Warmth",
  wobble: "Tape wobble",
  space: "Reverb",
  muffle: "Muffled tone",
};

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 78;

const polar = (index: number, fraction: number) => {
  const angle = (index / SOUND_TRAITS.length) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * RADIUS * fraction, y: CENTER + Math.sin(angle) * RADIUS * fraction };
};
const polygon = (fractions: readonly number[]) =>
  fractions.map((f, i) => {
    const { x, y } = polar(i, f);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

/** The six traits of the average sound, as a radar: each axis goes from none (center) to full. */
function TraitRadar({ traits }: { traits: Record<SoundTrait, number> }) {
  const [hover, setHover] = useState<SoundTrait | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>(SIZE);
  const values = SOUND_TRAITS.map((trait) => traits[trait]);
  const anchor = hover ? polar(SOUND_TRAITS.indexOf(hover), traits[hover]) : null;
  const scale = width / SIZE;
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-72">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full" role="img" aria-label="Your sound, trait by trait">
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <polygon key={ring} points={polygon(SOUND_TRAITS.map(() => ring))} fill="none" strokeWidth={1} className="stroke-border" />
        ))}
        {SOUND_TRAITS.map((trait, i) => {
          const end = polar(i, 1);
          const label = polar(i, 1.28);
          return (
            <g key={trait}>
              <line x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} strokeWidth={1} className="stroke-border" />
              <text x={label.x} y={label.y} dy="0.32em" textAnchor="middle" className={cn("text-[11px]", hover === trait ? "fill-text-primary" : "fill-text-muted")}>
                {TRAIT_LABELS[trait]}
              </text>
            </g>
          );
        })}
        <polygon points={polygon(values)} strokeWidth={2} strokeLinejoin="round" className="fill-accent/10 stroke-accent motion-safe:transition-all motion-safe:duration-500" />
        {SOUND_TRAITS.map((trait, i) => {
          const { x, y } = polar(i, traits[trait]);
          return (
            <g
              key={trait}
              tabIndex={0}
              role="img"
              aria-label={`${TRAIT_LABELS[trait]}: ${Math.round(traits[trait] * 100)} %`}
              onPointerEnter={() => setHover(trait)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(trait)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <circle cx={x} cy={y} r={hover === trait ? 5.5 : 4.5} strokeWidth={2} className="fill-accent stroke-surface" />
            </g>
          );
        })}
      </svg>
      {hover && anchor && (
        <ChartTooltip
          x={anchor.x * scale}
          y={anchor.y * scale}
          width={width}
          value={`${Math.round(traits[hover] * 100)} %`}
          label={TRAIT_LABELS[hover]}
        />
      )}
    </div>
  );
}

/** Listening per 5-BPM band, from the slowest tempo to the fastest. */
function TempoBars({ tempos, bpm }: { tempos: Record<string, number>; bpm: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const bands: number[] = [];
  for (let low = RANGES.bpm.min; low < RANGES.bpm.max; low += TEMPO_BAND) bands.push(low);
  const max = Math.max(0, ...bands.map((low) => tempos[String(low)] ?? 0));
  return (
    <div>
      <p className="mb-2 text-xs text-text-muted">
        Tempo · average <span className="font-semibold text-text-primary">{Math.round(bpm)} BPM</span>
      </p>
      <div className="flex h-16 items-end gap-1">
        {bands.map((low) => {
          const seconds = tempos[String(low)] ?? 0;
          return (
            <div
              key={low}
              tabIndex={0}
              role="img"
              aria-label={`${low} to ${low + TEMPO_BAND - 1} BPM: ${formatSpent(seconds)}`}
              onPointerEnter={() => setHover(low)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(low)}
              onBlur={() => setHover(null)}
              className="relative flex h-full flex-1 items-end"
            >
              <div
                className={cn("mx-auto w-full max-w-6 rounded-t-tile transition-colors", seconds > 0 ? "bg-accent" : "bg-surface-hover", hover === low && "bg-accent-hover")}
                style={{ height: `${max > 0 && seconds > 0 ? Math.max(6, (seconds / max) * 100) : 6}%` }}
              />
              {hover === low && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-control border bg-surface px-2 py-1 text-xs shadow-overlay">
                  <div className="font-semibold">{formatSpent(seconds)}</div>
                  <div className="text-text-muted">
                    {low}–{low + TEMPO_BAND - 1} BPM
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-text-muted" aria-hidden>
        <span>{RANGES.bpm.min}</span>
        <span>{RANGES.bpm.max} BPM</span>
      </div>
    </div>
  );
}

function Favorite({ instrument, shares, labels }: { instrument: string; shares: Record<string, number>; labels: readonly { value: string; label: string }[] }) {
  const top = ranked(shares)[0];
  if (!top) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-tile bg-surface-hover/60 px-3 py-2">
      <span className="text-xs text-text-muted">{instrument}</span>
      <span className="truncate text-sm font-medium">
        {labels.find((option) => option.value === top.key)?.label ?? top.key}
        <span className="ml-1.5 text-xs font-normal text-text-muted">{Math.round(top.value * 100)} %</span>
      </span>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 truncate text-text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-hover" aria-hidden>
        <span className="block h-full rounded-pill bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="w-9 text-right tabular-nums">{Math.round(value * 100)} %</span>
    </div>
  );
}

/** The ambience layers heard the most, loudest first. */
function TopAmbience({ ambience }: { ambience: Profile["ambience"] }) {
  const top = AMBIENCE_LAYERS.filter((id) => ambience[id] >= 0.01)
    .sort((a, b) => ambience[b] - ambience[a])
    .slice(0, 4);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-text-muted">Ambience</p>
      {top.length > 0 ? (
        top.map((id) => <Meter key={id} label={AMBIENCE_LABELS[id].label} value={ambience[id]} />)
      ) : (
        <p className="text-xs text-text-muted">No ambience: just the music.</p>
      )}
    </div>
  );
}

/** The average sound of what was heard over the range, weighted by listening time. */
export function SoundProfile({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <StatCard title="Your sound" subtitle="Listen to a few songs: your taste in tempo, texture and instruments shows here.">
        <p className="text-sm text-text-muted">Nothing heard in this period yet.</p>
      </StatCard>
    );
  }
  return (
    <StatCard title="Your sound" subtitle="The average of what you listened to, weighted by time.">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        <TraitRadar traits={profile.traits} />
        <div className="flex min-w-0 flex-col gap-4">
          <TempoBars tempos={profile.tempos} bpm={profile.bpm} />
          <div className="grid grid-cols-1 gap-1.5">
            <p className="text-xs text-text-muted">Favorite instruments</p>
            <Favorite instrument="Keys" shares={profile.voices.keys} labels={KEYS_VOICE_OPTIONS} />
            <Favorite instrument="Bass" shares={profile.voices.bass} labels={BASS_VOICE_OPTIONS} />
            <Favorite instrument="Drums" shares={profile.voices.drums} labels={DRUM_KIT_OPTIONS} />
          </div>
          <TopAmbience ambience={profile.ambience} />
        </div>
      </div>
    </StatCard>
  );
}
