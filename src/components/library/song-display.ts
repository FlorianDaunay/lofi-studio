import { CloudRain, Disc3, Music2, Wind, type LucideIcon } from "lucide-react";
import { chordName } from "@/audio";
import type { Song } from "@/songs/types";

/** The song's icon follows its loudest ambience layer, so songs are recognizable at a glance. */
export function songIcon({ params }: Pick<Song, "params">): LucideIcon {
  const { rain, vinyl, wind } = params.ambience;
  const loudest = Math.max(rain, vinyl, wind);
  if (loudest < 0.05) return Music2;
  if (loudest === rain) return CloudRain;
  if (loudest === wind) return Wind;
  return Disc3;
}

export const songChords = ({ params }: Pick<Song, "params">) => params.progression.map(chordName).join(" · ");
