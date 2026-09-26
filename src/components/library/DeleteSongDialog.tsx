import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import type { Song } from "@/songs/types";

interface DeleteSongDialogProps {
  /** The song to delete, or `null` when closed. */
  song: Song | null;
  onClose: () => void;
  onConfirm: (song: Song) => void;
}

export function DeleteSongDialog({ song, onClose, onConfirm }: DeleteSongDialogProps) {
  return (
    <Dialog
      open={song !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Delete this song?"
      description={song ? `“${song.name}” will be removed from your library. This cannot be undone.` : ""}
      className="w-[min(92vw,26rem)]"
    >
      <DialogFooter>
        <Button onClick={onClose}>Keep it</Button>
        <Button
          variant="primary"
          className="border-danger bg-danger hover:border-danger hover:bg-danger"
          onClick={() => {
            if (song) onConfirm(song);
            onClose();
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
