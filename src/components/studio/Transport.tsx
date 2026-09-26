import { LoaderCircle, Play, Save, Square } from "lucide-react";
import { useState } from "react";
import { SongCover } from "@/components/library/SongCover";
import { SongForm } from "@/components/library/SongForm";
import { PlayerControls } from "@/components/player/PlayerControls";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RANGES } from "@/songs/ranges";
import { canOverwriteCurrent, saveCurrentAs, saveCurrentChanges } from "@/state/actions";
import { togglePlay } from "@/state/bridge";
import { useCurrentSong } from "@/state/selectors";
import { useStudio } from "@/state/studio";
import { RandomizeMenu } from "./RandomizeMenu";

export function Transport() {
  const playing = useStudio((s) => s.playing);
  const starting = useStudio((s) => s.starting);
  const error = useStudio((s) => s.error);
  const dirty = useStudio((s) => s.dirty);
  const bpm = useStudio((s) => s.params.bpm);
  const volume = useStudio((s) => s.params.volume);
  const params = useStudio((s) => s.params);
  const setGlobal = useStudio((s) => s.setGlobal);
  const song = useCurrentSong();
  const [saving, setSaving] = useState(false);

  const canSaveChanges = dirty && song !== undefined && !song.builtIn && canOverwriteCurrent();

  return (
    <section aria-label="Transport" className="surface flex flex-wrap items-center gap-5 p-5">
      <Button
        variant="primary"
        size="hero"
        onClick={() => void togglePlay()}
        disabled={starting}
        aria-label={playing ? "Stop" : "Play"}
      >
        {starting ? (
          <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden />
        ) : playing ? (
          <Square className="h-6 w-6 fill-current" aria-hidden />
        ) : (
          <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
        )}
      </Button>

      {/* Live: the cover follows every tweak of the sound, saved or not. */}
      <SongCover params={params} className="hidden w-20 shrink-0 sm:block" />

      <div className="min-w-40 flex-1">
        <p className="text-xs uppercase tracking-wider text-text-muted">{playing ? "Now playing" : "Ready"}</p>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <span className="truncate">{song?.name ?? "Custom sound"}</span>
          {dirty && song && <span className="rounded-pill bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Modified</span>}
        </h2>
        <p className="font-mono text-xs text-text-secondary">{bpm} BPM</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-64">
        <Slider
          label="Volume"
          {...RANGES.volume}
          value={volume}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setGlobal({ volume: v })}
        />
        <div className="flex flex-wrap gap-2">
          <RandomizeMenu />
          {canSaveChanges && (
            <Button size="sm" variant="primary" onClick={saveCurrentChanges}>
              <Save className="h-4 w-4" aria-hidden />
              Save
            </Button>
          )}
          <Button size="sm" onClick={() => setSaving(true)}>
            <Save className="h-4 w-4" aria-hidden />
            Save as…
          </Button>
        </div>
      </div>

      <PlayerControls className="w-full border-t pt-4" />

      <SongForm
        open={saving}
        onOpenChange={setSaving}
        title="Save as a new song"
        description="It is added to your library and can be pinned on the Studio page."
        submitLabel="Save song"
        initial={{ name: song ? `${song.name} (mine)`.slice(0, 60) : "", description: "" }}
        onSubmit={saveCurrentAs}
      />
    </section>
  );
}
