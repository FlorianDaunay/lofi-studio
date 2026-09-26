import { memo, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { coverScene } from "@/songs/cover";
import type { SongParams } from "@/songs/types";
import { CoverScenery } from "./cover/CoverScenery";

interface SongCoverProps {
  params: SongParams;
  className?: string;
}

/** The song's cover: generated from its params, so similar songs get similar covers. Decorative (the name sits next to it). */
export const SongCover = memo(function SongCover({ params, className }: SongCoverProps) {
  const id = useId().replace(/:/g, "");
  const scene = useMemo(() => coverScene(params), [params]);
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("block aspect-square overflow-hidden rounded-tile", className)}>
      <CoverScenery scene={scene} id={id} />
    </svg>
  );
});
