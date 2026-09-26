import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { MAX_SONG_DESCRIPTION, MAX_SONG_NAME } from "@/songs/types";

interface SongFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  initial: { name: string; description: string };
  onSubmit: (values: { name: string; description: string }) => void;
}

function Fields({ initial, submitLabel, onCancel, onSubmit }: Pick<SongFormProps, "initial" | "submitLabel" | "onSubmit"> & { onCancel: () => void }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const valid = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="flex flex-col gap-4 px-5 py-4">
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
          Name
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_SONG_NAME} autoFocus placeholder="My rainy loop" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
          Description <span className="text-text-muted">(optional)</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_SONG_DESCRIPTION}
            rows={2}
            placeholder="Late-night study, soft keys…"
          />
        </label>
      </div>
      <DialogFooter>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!valid}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Name + description dialog, used both to save a new song and to edit an existing one. */
export function SongForm({ open, onOpenChange, title, description, submitLabel, initial, onSubmit }: SongFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} className="w-[min(92vw,28rem)]">
      {/* Mounted only while open, so the fields start from `initial` every time. */}
      <Fields
        initial={initial}
        submitLabel={submitLabel}
        onSubmit={(values) => {
          onSubmit(values);
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
