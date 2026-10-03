import { Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { REPEAT_MODES, type PlaySource, type RepeatMode } from "@/songs/playback";
import { BUILT_IN_PLAYLISTS } from "@/songs/builtin-playlists";
import { findPlaylist, useLibrary } from "@/state/library";
import { playNext, playPrevious, setRepeat, setShuffle, setSource } from "@/state/playback";
import { usePlayer } from "@/state/player";
import { SleepTimerMenu } from "./SleepTimerMenu";

const REPEAT_LABELS: Record<RepeatMode, string> = {
  off: "Repeat off: stop after the last song",
  all: "Repeat all: start over after the last song",
  one: "Repeat this song",
};

const sourceValue = (source: PlaySource) => (source.kind === "playlist" ? `playlist:${source.id}` : "library");

/** Where songs come from, plus previous / next, shuffle, repeat and the sleep timer. Play / stop stays with the caller. */
export function PlayerControls({ className }: { className?: string }) {
  const source = usePlayer((s) => s.source);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const playlists = useLibrary((s) => s.playlists);

  // A playlist that was deleted reads as the whole library, as the player does.
  const value = source.kind === "playlist" && findPlaylist(playlists, source.id) ? sourceValue(source) : "library";
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  const nextRepeat = () => setRepeat(REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length]!);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShuffle(!shuffle)}
        aria-pressed={shuffle}
        aria-label="Shuffle"
        title={shuffle ? "Shuffle on" : "Shuffle off"}
        className={cn(shuffle && "bg-accent/15 text-accent")}
      >
        <Shuffle className="h-4 w-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={playPrevious} aria-label="Previous song" title="Previous song">
        <SkipBack className="h-4 w-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={playNext} aria-label="Next song" title="Next song">
        <SkipForward className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={nextRepeat}
        aria-label={REPEAT_LABELS[repeat]}
        title={REPEAT_LABELS[repeat]}
        className={cn(repeat !== "off" && "bg-accent/15 text-accent")}
      >
        <RepeatIcon className="h-4 w-4" aria-hidden />
      </Button>
      <SleepTimerMenu />
      <Select
        label="Play from"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setSource(next.startsWith("playlist:") ? { kind: "playlist", id: next.slice("playlist:".length) } : { kind: "library" });
        }}
        className="w-auto min-w-40 flex-1 sm:max-w-56"
      >
        <option value="library">Whole library</option>
        {playlists.length > 0 && (
          <optgroup label="My playlists">
            {playlists.map((list) => (
              <option key={list.id} value={`playlist:${list.id}`}>
                {list.name}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Built-in playlists">
          {BUILT_IN_PLAYLISTS.map((list) => (
            <option key={list.id} value={`playlist:${list.id}`}>
              {list.name}
            </option>
          ))}
        </optgroup>
      </Select>
    </div>
  );
}
