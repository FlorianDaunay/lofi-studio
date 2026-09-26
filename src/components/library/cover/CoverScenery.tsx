import type { CoverScene } from "@/songs/cover";
import { Landmarks } from "./Landmarks";
import { GROUND, fadeIn, hsl, palette, spread } from "./paint";
import { Sky } from "./Sky";

interface CoverSceneryProps {
  scene: CoverScene;
  /** Unique within the page: gradient ids must not collide between covers. */
  id: string;
}

/**
 * Draws a cover scene on a 100 x 100 canvas: the sky, the song's world with one landmark per
 * chord, the weather from the ambience, and a strip showing the 16-step pattern of each track.
 */
export function CoverScenery({ scene, id }: CoverSceneryProps) {
  const paint = palette(scene);
  const { hue, saturation: sat, top } = paint;

  return (
    <>
      <Sky scene={scene} paint={paint} id={id} />
      <Landmarks scene={scene} paint={paint} />

      <rect y={GROUND} width="100" height={100 - GROUND} fill={hsl(hue, sat * 0.6, top - 8)} opacity="0.9" />
      {scene.tracks.map((track, row) =>
        track.steps.map((on, step) => (
          <rect
            key={`${row}-${step}`}
            x={12 + step * 4.75}
            y={GROUND + 1.5 + row * 2.1}
            width="3.4"
            height="1.3"
            fill={hsl(hue + 60 + row * 18, 70, 76)}
            opacity={on ? 0.3 + track.level * 0.7 : 0.1}
          />
        )),
      )}

      {Array.from({ length: 24 }, (_, i) => {
        const opacity = fadeIn(scene.rain, 24, i) * 0.55;
        if (opacity <= 0) return null;
        const x = spread(i) * 100;
        const y = spread(i + 24) * 70;
        return <line key={i} x1={x} y1={y} x2={x - 1.5 - scene.wind * 5} y2={y + 7} stroke={hsl(hue + 180, 60, 85)} strokeWidth="0.45" opacity={opacity} />;
      })}

      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={i}
          x1={10 + spread(i + 3) * 40}
          y1={14 + i * 8}
          x2={30 + spread(i + 3) * 40 + scene.wind * 14}
          y2={14 + i * 8}
          stroke={hsl(hue, 30, 90)}
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity={fadeIn(scene.wind, 5, i) * 0.45}
        />
      ))}

      {[5, 9, 13].map((radius, i) => (
        <circle key={radius} cx="86" cy="15" r={radius} fill="none" stroke={hsl(hue, 20, 90)} strokeWidth="0.5" opacity={fadeIn(scene.vinyl, 3, i) * 0.5} />
      ))}
    </>
  );
}
