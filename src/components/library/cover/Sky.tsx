import type { CoverScene } from "@/songs/cover";
import { fadeIn, hsl, spread, type Palette } from "./paint";

interface SkyProps {
  scene: CoverScene;
  paint: Palette;
  id: string;
}

const STARS = 18;
const CLOUDS = [
  { x: 18, y: 16, w: 22 },
  { x: 62, y: 11, w: 26 },
  { x: 40, y: 27, w: 18 },
  { x: 80, y: 30, w: 16 },
];
const BIRDS = 5;

/** Sky gradient, stars at night, the sun (a moon when it is dark), clouds from the pad and birds from the melody. */
export function Sky({ scene, paint, id }: SkyProps) {
  const { hue, saturation: sat, top } = paint;
  const { sun, night } = scene;
  const lowerHue = hue + 20 + scene.drift * 70;
  const sunX = 22 + sun.x * 56;
  const sunR = 7 + sun.size * 11;
  const sunColor = night > 0.5 ? hsl(hue + 30, 30, 88) : hsl(hue + 40, 75, 72);

  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hsl(hue, sat, top)} />
          <stop offset="1" stopColor={hsl(lowerHue, sat, top + 14)} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={sunColor} stopOpacity={0.9} />
          <stop offset="0.45" stopColor={sunColor} stopOpacity={0.4} />
          <stop offset="1" stopColor={sunColor} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-sky)`} />

      {Array.from({ length: STARS }, (_, i) => (
        <circle
          key={i}
          cx={spread(i + 5) * 100}
          cy={spread(i + 30) * 50}
          r={0.35 + spread(i + 9) * 0.5}
          fill="white"
          opacity={night * (0.4 + spread(i) * 0.6)}
        />
      ))}

      <circle cx={sunX} cy="34" r={sunR * (1.5 + sun.glow * 1.6)} fill={`url(#${id}-sun)`} opacity={(0.5 + sun.opacity * 0.5) * (1 - night * 0.5)} />
      <circle cx={sunX} cy="34" r={sunR} fill={sunColor} opacity={0.45 + sun.opacity * 0.55} />
      {/* The night bites into the sun: a crescent moon. */}
      <circle cx={sunX + sunR * 0.45} cy={34 - sunR * 0.2} r={sunR * 0.9} fill={hsl(hue + (lowerHue - hue) * 0.3, sat, top + 4)} opacity={night} />

      {CLOUDS.map((cloud, i) => (
        <g key={i} opacity={fadeIn(scene.clouds, CLOUDS.length, i) * 0.55} fill={hsl(hue + 10, 25, 70 + top * 0.3)}>
          <ellipse cx={cloud.x} cy={cloud.y} rx={cloud.w / 2} ry={cloud.w / 7} />
          <ellipse cx={cloud.x - cloud.w / 6} cy={cloud.y - cloud.w / 9} rx={cloud.w / 4} ry={cloud.w / 6} />
          <ellipse cx={cloud.x + cloud.w / 7} cy={cloud.y - cloud.w / 12} rx={cloud.w / 5} ry={cloud.w / 7} />
        </g>
      ))}

      {Array.from({ length: BIRDS }, (_, i) => {
        const x = 58 + i * 6 + spread(i + 40) * 4;
        const y = 18 + spread(i + 44) * 12;
        const w = 1.6 + spread(i + 48) * 1.2;
        return (
          <path
            key={i}
            d={`M${x - w},${y - w * 0.5} Q${x - w * 0.4},${y - w * 0.7} ${x},${y} Q${x + w * 0.4},${y - w * 0.7} ${x + w},${y - w * 0.5}`}
            fill="none"
            stroke={hsl(hue, 30, 12)}
            strokeWidth="0.5"
            strokeLinecap="round"
            opacity={fadeIn(scene.birds, BIRDS, i) * 0.8}
          />
        );
      })}
    </>
  );
}
