import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { DeleteSongDialog } from "@/components/library/DeleteSongDialog";
import { PlaylistPicker } from "@/components/library/PlaylistPicker";
import { SlotPicker } from "@/components/library/SlotPicker";
import { SongCard } from "@/components/library/SongCard";
import { SongForm } from "@/components/library/SongForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveTextFile } from "@/lib/files";
import { BUILT_IN_SONGS } from "@/songs/builtin";
import { shareFileName, toShareFile } from "@/songs/share";
import type { Song } from "@/songs/types";
import { copySong, saveCurrentAs } from "@/state/actions";
import { useLibrary } from "@/state/library";
import { useCurrentSong } from "@/state/selectors";
import { useStudio } from "@/state/studio";

const matches = (song: Song, needle: string) => !needle || `${song.name} ${song.description}`.toLowerCase().includes(needle);

/** Every song, split into the user's own and the built-in ones. */
export function LibraryPage() {
  const userSongs = useLibrary((s) => s.songs);
  const pinned = useLibrary((s) => s.pinned);
  const updateSong = useLibrary((s) => s.updateSong);
  const deleteSong = useLibrary((s) => s.deleteSong);
  const loadSong = useStudio((s) => s.loadSong);
  const current = useCurrentSong();

  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState<Song | null>(null);
  const [pinning, setPinning] = useState<Song | null>(null);
  const [listing, setListing] = useState<Song | null>(null);

  const needle = query.trim().toLowerCase();
  const mine = userSongs.filter((song) => matches(song, needle));
  const builtIn = BUILT_IN_SONGS.filter((song) => matches(song, needle));

  const exportSong = async (song: Song) => {
    try {
      const selection = { songs: [song], playlists: [] };
      const saved = await saveTextFile(shareFileName(selection), toShareFile(selection));
      if (saved) setNotice(`Exported “${song.name}”.`);
    } catch (error) {
      setNotice(`Could not export: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderCard = (song: Song) => (
    <SongCard
      key={song.id}
      song={song}
      current={song.id === current?.id}
      pinnedSlot={pinned.includes(song.id) ? pinned.indexOf(song.id) + 1 : null}
      onLoad={() => loadSong(song)}
      onPin={() => setPinning(song)}
      onPlaylist={() => setListing(song)}
      onExport={() => void exportSong(song)}
      onCopy={song.builtIn ? () => setNotice(copySong(song) ? `Saved a copy of “${song.name}” in My songs.` : "Your library is full.") : undefined}
      onEdit={song.builtIn ? undefined : () => setEditing(song)}
      onDelete={song.builtIn ? undefined : () => setDeleting(song)}
    />
  );

  return (
    <>
      <PageHeader
        title="Library"
        description="Your songs and the built-in ones. Pin four of them to the Studio page."
        actions={
          <Button variant="primary" onClick={() => setSaving(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Save current sound
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs…" aria-label="Search songs" className="pl-9" />
      </div>

      {notice && (
        <p role="status" className="rounded-control border bg-surface px-3 py-2 text-sm text-text-secondary">
          {notice}
        </p>
      )}

      <section aria-label="My songs">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">My songs ({userSongs.length})</h2>
        {userSongs.length === 0 ? (
          <p className="surface p-6 text-center text-sm text-text-muted">
            Nothing here yet. Shape a sound in the Studio, then use “Save current sound”, or import a song someone shared.
          </p>
        ) : mine.length === 0 ? (
          <p className="text-sm text-text-muted">No song of yours matches “{query}”.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{mine.map(renderCard)}</ul>
        )}
      </section>

      <section aria-label="Built-in songs">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Built-in ({builtIn.length})</h2>
        {builtIn.length === 0 ? (
          <p className="text-sm text-text-muted">No built-in song matches “{query}”.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">{builtIn.map(renderCard)}</ul>
        )}
      </section>

      <SongForm
        open={saving}
        onOpenChange={setSaving}
        title="Save the current sound"
        description="It is added to My songs."
        submitLabel="Save song"
        initial={{ name: current && !current.builtIn ? `${current.name} (mine)`.slice(0, 60) : (current?.name ?? ""), description: "" }}
        onSubmit={(values) => {
          const song = saveCurrentAs(values);
          setNotice(song ? `Saved “${song.name}” in My songs.` : "Your library is full.");
        }}
      />
      <SongForm
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Rename song"
        description="Change how this song is named and described."
        submitLabel="Save"
        initial={{ name: editing?.name ?? "", description: editing?.description ?? "" }}
        onSubmit={(values) => editing && updateSong(editing.id, values)}
      />
      <DeleteSongDialog song={deleting} onClose={() => setDeleting(null)} onConfirm={(song) => deleteSong(song.id)} />
      <SlotPicker song={pinning} onClose={() => setPinning(null)} />
      <PlaylistPicker song={listing} onClose={() => setListing(null)} />
    </>
  );
}
