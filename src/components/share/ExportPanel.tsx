import { ListMusic, Music, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { SongCover } from "@/components/library/SongCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExportSelection, Shareable } from "@/songs/share";
import type { Song } from "@/songs/types";
import { findSong, useLibrary } from "@/state/library";
import { useAllPlaylists, useAllSongs } from "@/state/selectors";
import { currentSongParams, useStudio } from "@/state/studio";
import { ExportSummary } from "./ExportSummary";
import { SelectableTile } from "./SelectableTile";

const CURRENT = "current";

const toggled = (set: ReadonlySet<string>, key: string) => {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
};

const matches = (name: string, needle: string) => !needle || name.toLowerCase().includes(needle);

/** Pick songs and playlists as cover tiles; the summary on the side packs them into a file or a code. */
export function ExportPanel() {
  const songs = useAllSongs();
  const playlists = useAllPlaylists();
  const userSongs = useLibrary((s) => s.songs);
  const params = useStudio((s) => s.params);
  const songId = useStudio((s) => s.songId);
  const dirty = useStudio((s) => s.dirty);
  const known = songs.some((song) => song.id === songId);

  const [pickedSongs, setPickedSongs] = useState<ReadonlySet<string>>(() => new Set(songId && known && !dirty ? [songId] : [CURRENT]));
  const [pickedPlaylists, setPickedPlaylists] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  // The live sound is offered too when it is not exactly a saved song (unsaved or modified).
  const current = useMemo<Shareable | null>(
    () => (!known || dirty ? { name: "Current sound", description: "Exported from the Studio.", params: currentSongParams(params) } : null),
    [known, dirty, params],
  );

  const selection = useMemo<ExportSelection>(
    () => ({
      songs: [...(current && pickedSongs.has(CURRENT) ? [current] : []), ...songs.filter((song) => pickedSongs.has(song.id))],
      playlists: playlists
        .filter((list) => pickedPlaylists.has(list.id))
        .map((list) => ({ ...list, songs: list.songIds.flatMap((id) => findSong(userSongs, id) ?? []) })),
    }),
    [current, pickedSongs, songs, playlists, pickedPlaylists, userSongs],
  );

  const shownSongs = songs.filter((song) => matches(song.name, needle));
  const shownPlaylists = playlists.filter((list) => matches(list.name, needle));

  const selectAll = (ids: string[], set: (next: ReadonlySet<string>) => void, picked: ReadonlySet<string>) => {
    const all = ids.every((id) => picked.has(id));
    const next = new Set(picked);
    for (const id of ids) {
      if (all) next.delete(id);
      else next.add(id);
    }
    set(next);
  };

  const songTile = (song: Song) => (
    <SelectableTile
      key={song.id}
      selected={pickedSongs.has(song.id)}
      onToggle={() => setPickedSongs((prev) => toggled(prev, song.id))}
      cover={<SongCover params={song.params} className="w-full" />}
      title={song.name}
      meta={`${song.params.bpm} BPM`}
      badge={song.builtIn ? undefined : "Mine"}
    />
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_19rem]">
      <section aria-label="Choose what to send" className="surface flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <Tabs defaultValue="songs" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <TabsList aria-label="Kind of item" className="w-full sm:w-auto">
              <TabsTrigger value="songs">
                <Music className="h-4 w-4" aria-hidden />
                Songs
                <Count n={pickedSongs.size} />
              </TabsTrigger>
              <TabsTrigger value="playlists">
                <ListMusic className="h-4 w-4" aria-hidden />
                Playlists
                <Count n={pickedPlaylists.size} />
              </TabsTrigger>
            </TabsList>
            <div className="relative min-w-40 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…" aria-label="Filter songs and playlists" className="pl-9" />
            </div>
          </div>

          <TabsContent value="songs" className="flex flex-col gap-3 outline-none">
            <Toolbar
              label={`${shownSongs.length} songs`}
              onAll={() =>
                selectAll(
                  shownSongs.map((song) => song.id),
                  setPickedSongs,
                  pickedSongs,
                )
              }
              onClear={() => setPickedSongs(new Set())}
            />
            <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 xl:grid-cols-4">
              {current && matches(current.name, needle) && (
                <SelectableTile
                  selected={pickedSongs.has(CURRENT)}
                  onToggle={() => setPickedSongs((prev) => toggled(prev, CURRENT))}
                  cover={<SongCover params={current.params} className="w-full" />}
                  title={current.name}
                  meta={`${current.params.bpm} BPM`}
                  badge="Unsaved"
                />
              )}
              {shownSongs.map(songTile)}
            </ul>
            {shownSongs.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No song matches “{query}”.</p>}
          </TabsContent>

          <TabsContent value="playlists" className="flex flex-col gap-3 outline-none">
            <Toolbar
              label={`${shownPlaylists.length} playlists`}
              onAll={() =>
                selectAll(
                  shownPlaylists.map((list) => list.id),
                  setPickedPlaylists,
                  pickedPlaylists,
                )
              }
              onClear={() => setPickedPlaylists(new Set())}
            />
            <ul className="grid grid-cols-3 gap-1.5 sm:gap-2 xl:grid-cols-4">
              {shownPlaylists.map((list) => {
                const members = list.songIds.flatMap((id) => findSong(userSongs, id) ?? []);
                return (
                  <SelectableTile
                    key={list.id}
                    selected={pickedPlaylists.has(list.id)}
                    onToggle={() => setPickedPlaylists((prev) => toggled(prev, list.id))}
                    cover={<PlaylistCover songs={members} className="w-full" />}
                    title={list.name}
                    meta={`${members.length} ${members.length === 1 ? "song" : "songs"}`}
                    badge={list.builtIn ? undefined : "Mine"}
                  />
                );
              })}
            </ul>
            {shownPlaylists.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No playlist matches.</p>}
            <p className="text-xs text-text-muted">A playlist travels with its own songs, so your friend gets everything it needs.</p>
          </TabsContent>
        </Tabs>
      </section>

      <ExportSummary selection={selection} />
    </div>
  );
}

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="rounded-pill bg-accent px-1.5 text-[0.65rem] leading-4 text-accent-foreground">{n}</span>;
}

function Toolbar({ label, onAll, onClear }: { label: string; onAll: () => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1 text-xs text-text-muted">
      <span className="flex-1">{label}</span>
      <Button size="sm" variant="ghost" onClick={onAll}>
        Select all
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
