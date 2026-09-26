import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlaylistCard } from "@/components/playlists/PlaylistCard";
import { PlaylistDetail } from "@/components/playlists/PlaylistDetail";
import { PlaylistNameForm } from "@/components/playlists/PlaylistNameForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { BUILT_IN_PLAYLISTS } from "@/songs/builtin-playlists";
import { MAX_PLAYLISTS, type Playlist } from "@/songs/types";
import { copyPlaylist } from "@/state/actions";
import { findPlaylist, useLibrary } from "@/state/library";
import { usePlayer } from "@/state/player";

type Form = { kind: "create" } | { kind: "rename"; playlist: Playlist } | null;

/** The user's playlists as cover cards; opening one shows its songs. */
export function PlaylistsPage() {
  const playlists = useLibrary((s) => s.playlists);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const renamePlaylist = useLibrary((s) => s.renamePlaylist);
  const deletePlaylist = useLibrary((s) => s.deletePlaylist);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [deleting, setDeleting] = useState<Playlist | null>(null);

  const open = openId === null ? undefined : findPlaylist(playlists, openId);
  const full = playlists.length >= MAX_PLAYLISTS;
  const [notice, setNotice] = useState<string | null>(null);

  const copy = (playlist: Playlist) => {
    const created = copyPlaylist(playlist);
    if (created) setOpenId(created.id);
    else setNotice("You reached the limit of playlists: delete one first.");
  };

  return (
    <>
      {open ? (
        <PlaylistDetail playlist={open} onBack={() => setOpenId(null)} onRename={() => setForm({ kind: "rename", playlist: open })} onCopy={() => copy(open)} />
      ) : (
        <>
          <PageHeader
            title="Playlists"
            description="Group songs, then play them in order or shuffled. The Studio page has the player controls."
            actions={
              <Button
                variant="primary"
                disabled={full}
                onClick={() => setForm({ kind: "create" })}
                title={full ? "You reached the limit of playlists." : undefined}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New playlist
              </Button>
            }
          />
          {notice && (
            <p role="status" className="rounded-control border bg-surface px-3 py-2 text-sm text-text-secondary">
              {notice}
            </p>
          )}
          <section aria-label="My playlists">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">My playlists ({playlists.length})</h2>
            {playlists.length === 0 ? (
              <p className="surface p-6 text-center text-sm text-text-muted">
                No playlist of yours yet. Create one, copy a built-in one below, or use the playlist button on a song in the Library.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onOpen={() => setOpenId(playlist.id)}
                    onRename={() => setForm({ kind: "rename", playlist })}
                    onDelete={() => setDeleting(playlist)}
                  />
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Built-in playlists">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Built-in ({BUILT_IN_PLAYLISTS.length})</h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {BUILT_IN_PLAYLISTS.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} onOpen={() => setOpenId(playlist.id)} onCopy={() => copy(playlist)} />
              ))}
            </ul>
          </section>
        </>
      )}

      <PlaylistNameForm
        open={form !== null}
        onOpenChange={(next) => !next && setForm(null)}
        title={form?.kind === "rename" ? "Rename playlist" : "New playlist"}
        submitLabel={form?.kind === "rename" ? "Save" : "Create"}
        initialName={form?.kind === "rename" ? form.playlist.name : ""}
        onSubmit={(name) => {
          if (form?.kind === "rename") renamePlaylist(form.playlist.id, name);
          else {
            const created = createPlaylist(name);
            if (created) setOpenId(created.id);
          }
        }}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title="Delete this playlist?"
        description={deleting ? `“${deleting.name}” will be removed. Its songs stay in your library.` : ""}
        className="w-[min(92vw,26rem)]"
      >
        <DialogFooter>
          <Button onClick={() => setDeleting(null)}>Keep it</Button>
          <Button
            variant="primary"
            className="border-danger bg-danger hover:border-danger hover:bg-danger"
            onClick={() => {
              if (deleting) {
                deletePlaylist(deleting.id);
                // The player falls back to the whole library on its own; make the choice explicit too.
                const { source, set } = usePlayer.getState();
                if (source.kind === "playlist" && source.id === deleting.id) set({ source: { kind: "library" } });
              }
              setDeleting(null);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
