import { chordName } from "@/audio";
import type { Song } from "@/songs/types";

export const songChords = ({ params }: Pick<Song, "params">) => params.progression.map(chordName).join(" · ");
