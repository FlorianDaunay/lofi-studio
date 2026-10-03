import { useEffect, useMemo, useRef } from "react";
import { CoverScenery } from "@/components/library/cover/CoverScenery";
import { coverScene } from "@/songs/cover";
import { useActiveTheme } from "@/themes";
import { parseColor, toHex } from "@/themes/color";
import { useMediaArtwork } from "@/state/media";
import { useStudio } from "@/state/studio";

/** Big enough for a lock screen, small enough to cross to the system in one go. */
const SIZE = 320;
/** Edits move the cover continuously: wait for a pause before drawing it again. */
const SETTLE_MS = 600;

/** Draws the SVG on a canvas, with a wash of the theme's background rising from the bottom edge. */
async function toPng(svg: SVGSVGElement, wash: string): Promise<string> {
  const image = new Image();
  // A data URL: the app's CSP allows images from `data:` (not from `blob:`).
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas.");
  context.drawImage(image, 0, 0, SIZE, SIZE);
  // The system's player takes its colors from the artwork: the wash pulls them towards the theme.
  const gradient = context.createLinearGradient(0, SIZE, 0, SIZE * 0.45);
  gradient.addColorStop(0, `${wash}a6`);
  gradient.addColorStop(1, `${wash}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE, SIZE);
  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

/**
 * Android: renders the current cover off screen and hands it to the media notification and lock
 * screen as a PNG. Mounted only there, where something shows it.
 */
export function MediaArtwork() {
  const params = useStudio((s) => s.params);
  const theme = useActiveTheme();
  const svg = useRef<SVGSVGElement>(null);
  const scene = useMemo(() => coverScene(params), [params]);
  // The volume and a few other params do not change the picture: only a new scene redraws it.
  const key = useMemo(() => JSON.stringify(scene), [scene]);
  const wash = toHex({ ...parseColor(theme.colors.canvas), a: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!svg.current) return;
      toPng(svg.current, wash)
        .then((png) => useMediaArtwork.setState({ png }))
        .catch((error: unknown) => console.warn("Could not draw the notification artwork.", error));
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [key, wash]);

  return (
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={SIZE} height={SIZE}>
        <CoverScenery scene={scene} id="media-artwork" />
      </svg>
    </div>
  );
}
