import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_SONG_NAME } from "@/songs/types";

interface PlaylistNameFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName: string;
  onSubmit: (name: string) => void;
}

function Field({ initialName, submitLabel, onCancel, onSubmit }: Pick<PlaylistNameFormProps, "initialName" | "submitLabel" | "onSubmit"> & { onCancel: () => void }) {
  const [name, setName] = useState(initialName);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };
  return (
    <form onSubmit={submit}>
      <label className="flex flex-col gap-1.5 px-5 py-4 text-xs text-text-secondary">
        Name
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_SONG_NAME} autoFocus placeholder="Late-night study" />
      </label>
      <DialogFooter>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Asks for a playlist name: used to create one and to rename one. */
export function PlaylistNameForm({ open, onOpenChange, title, submitLabel, initialName, onSubmit }: PlaylistNameFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description="Playlists are kept on this computer, next to your songs." className="w-[min(92vw,26rem)]">
      {/* Mounted only while open, so the field starts from `initialName` every time. */}
      <Field
        initialName={initialName}
        submitLabel={submitLabel}
        onCancel={() => onOpenChange(false)}
        onSubmit={(name) => {
          onSubmit(name);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
