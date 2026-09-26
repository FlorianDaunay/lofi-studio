import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PINNED_SLOTS, type Song } from "@/songs/types";
import { findSong, useLibrary } from "@/state/library";

interface SlotPickerProps {
  /** The song to pin, or `null` when closed. */
  song: Song | null;
  onClose: () => void;
}

const slots = Array.from({ length: PINNED_SLOTS }, (_, i) => i);

/** Choose which of the four pinned slots a song should take. */
export function SlotPicker({ song, onClose }: SlotPickerProps) {
  const pinned = useLibrary((s) => s.pinned);
  const userSongs = useLibrary((s) => s.songs);
  const pinSong = useLibrary((s) => s.pinSong);

  return (
    <Dialog
      open={song !== null}
      onOpenChange={(open) => !open && onClose()}
      title={song ? `Pin “${song.name}”` : "Pin a song"}
      description="Pick a slot on the Studio page. The song already there is replaced."
      className="w-[min(92vw,26rem)]"
    >
      <ul className="flex flex-col gap-1 p-3">
        {song &&
          slots.map((slot) => {
            const occupant = findSong(userSongs, pinned[slot] ?? null);
            const here = pinned[slot] === song.id;
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => {
                    pinSong(slot, song.id);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover",
                    here && "bg-accent/10",
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-surface-hover font-mono text-xs">{slot + 1}</span>
                  <span className="flex-1 truncate">{occupant?.name ?? "Empty"}</span>
                  {here && <span className="text-xs text-accent">Pinned</span>}
                </button>
              </li>
            );
          })}
      </ul>
    </Dialog>
  );
}
