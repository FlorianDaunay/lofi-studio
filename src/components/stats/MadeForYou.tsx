import { Check, Dices, Play, Plus } from "lucide-react";
import { useState } from "react";
import { AMBIENCE_LAYERS } from "@/audio";
import { SongCover } from "@/components/library/SongCover";
import { AMBIENCE_LABELS } from "@/components/studio/ambience-labels";
import { BASS_VOICE_OPTIONS, DRUM_KIT_OPTIONS, KEYS_VOICE_OPTIONS, LEAD_VOICE_OPTIONS, PAD_VOICE_OPTIONS } from "@/components/studio/instrument-labels";
import { Button } from "@/components/ui/button";
import type { SoundProfile } from "@/songs/insights";
import { seededRng, songForProfile } from "@/songs/recommend";
import type { SongParams } from "@/songs/types";
import { saveDraft } from "@/state/actions";
import { playUnsaved } from "@/state/playback";

const labelOf = <T extends string>(options: readonly { value: T; label: string }[], value: T) => options.find((option) => option.value === value)?.label ?? value;
/** A fresh song each time; the profile is read then, so stats ticking in the background never swap it under the reader. */
const generate = (profile: SoundProfile) => songForProfile(profile, seededRng(Math.floor(Math.random() * 2 ** 32)));

/** What the song is made of, in a few words: the instruments, the ambience, the tempo. */
function ingredients(params: SongParams): string[] {
  return [
    labelOf(KEYS_VOICE_OPTIONS, params.keys.voice),
    `${labelOf(BASS_VOICE_OPTIONS, params.bass.voice)} bass`,
    labelOf(DRUM_KIT_OPTIONS, params.drums.kit),
    ...(params.pad.level > 0 ? [`${labelOf(PAD_VOICE_OPTIONS, params.pad.voice)} pad`] : []),
    ...(params.lead.level > 0 ? [labelOf(LEAD_VOICE_OPTIONS, params.lead.voice)] : []),
    ...AMBIENCE_LAYERS.filter((id) => params.ambience[id] > 0).map((id) => AMBIENCE_LABELS[id].label),
    `${params.bpm} BPM`,
  ];
}

type Saved = "no" | "yes" | "full";

/** A new song in the listener's taste, generated from the sound profile of the period (key it by the period). */
export function MadeForYou({ profile }: { profile: SoundProfile }) {
  const [song, setSong] = useState(() => generate(profile));
  const [saved, setSaved] = useState<Saved>("no");
  const [played, setPlayed] = useState(false);

  const another = () => {
    setSong(generate(profile));
    setSaved("no");
    setPlayed(false);
  };
  const save = () => setSaved(saveDraft(song) ? "yes" : "full");
  const play = () => {
    setPlayed(true);
    void playUnsaved(song.params);
  };

  return (
    <section aria-label="Made for you" className="surface flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Made for you</h2>
          <p className="text-xs text-text-muted">A new song, generated from the instruments, tempo and ambience you listen to the most.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={another}>
          <Dices className="h-4 w-4" aria-hidden />
          Another one
        </Button>
      </header>

      <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
        <SongCover params={song.params} className="w-28 shrink-0 shadow-card sm:w-32" />
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="truncate text-lg font-semibold">{song.name}</p>
            <ul aria-label="Made of" className="mt-1.5 flex flex-wrap gap-1">
              {ingredients(song.params).map((item) => (
                <li key={item} className="rounded-pill bg-surface-hover px-2 py-0.5 text-[11px] text-text-secondary">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={play}>
              <Play className="h-4 w-4 fill-current" aria-hidden />
              {played ? "Play again" : "Play"}
            </Button>
            <Button size="sm" onClick={save} disabled={saved === "yes"}>
              {saved === "yes" ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {saved === "yes" ? "In your library" : "Save to library"}
            </Button>
          </div>
          <p className="text-xs text-text-muted" aria-live="polite">
            {saved === "full"
              ? "Your library is full: delete a song to make room."
              : played && saved === "no"
                ? "Playing in the Studio, unsaved: it loops until you save it. Randomize > Undo brings your previous sound back."
                : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
