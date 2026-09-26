import type { CoverScene } from "@/songs/cover";

/**
 * Draws a cover scene on a 100 x 100 canvas: a night sky, sun, rolling hills, a city skyline (one
 * building per chord) and a strip showing the 16-step pattern of each track. It is the only place
 * where colors are computed: the art's palette is derived from the song, not from the theme, so a
 * cover looks the same in every theme.
 */

const hsl = (hue: number, saturation: number, lightness: number) =>
  `hsl(${(((hue % 360) + 360) % 360).toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
/** How much of layer `index` (out of many) is visible at `amount`: layers fade in one by one. */
const fadeIn = (amount: number, count: number, index: number) => clamp01(amount * count - index);

/** Fixed positions for rain streaks and windows: a constant table, so covers never flicker or depend on chance. */
const SPREAD = Array.from({ length: 48 }, (_, i) => (Math.sin(i * 12.9898 + 1.7) * 43758.5453) % 1).map(Math.abs);
const spread = (index: number) => SPREAD[index % SPREAD.length] ?? 0;

const WAVE_POINTS = 24;

function wavePath(base: number, amplitude: number, frequency: number, phase: number): string {
  const points = Array.from({ length: WAVE_POINTS + 1 }, (_, i) => {
    const x = (i / WAVE_POINTS) * 100;
    const y = base + amplitude * Math.sin((x / 100) * frequency * 2 * Math.PI + phase);
    return `${x.toFixed(1)},${y.toFixed(2)}`;
  });
  return `M0,100 L${points.join(" L")} L100,100 Z`;
}

interface CoverSceneryProps {
  scene: CoverScene;
  /** Unique within the page: gradient ids must not collide between covers. */
  id: string;
}

export function CoverScenery({ scene, id }: CoverSceneryProps) {
  const hue = scene.hue * 360;
  const lowerHue = hue + 20 + scene.drift * 70;
  const sat = 25 + scene.saturation * 45;
  const top = 13 + scene.lightness * 27;
  const { sun, wave, skyline, tracks } = scene;

  const sunX = 22 + sun.x * 56;
  const sunR = 7 + sun.size * 11;
  const sunColor = hsl(hue + 40, 75, 72);
  const buildingWidth = 84 / skyline.length;

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

      <circle cx={sunX} cy="34" r={sunR * (1.5 + sun.glow * 1.6)} fill={`url(#${id}-sun)`} opacity={0.5 + sun.opacity * 0.5} />
      <circle cx={sunX} cy="34" r={sunR} fill={sunColor} opacity={0.45 + sun.opacity * 0.55} />

      {[0, 1, 2].map((layer) => (
        <path
          key={layer}
          d={wavePath(
            50 + layer * 8,
            1.5 + wave.amplitude * 7,
            0.8 + wave.rate * 3 + layer * 0.35,
            scene.wave.phase * 2 * Math.PI + layer * (0.7 + wave.jitter * 2),
          )}
          fill={hsl(hue + 25 * (layer + 1), sat * 0.9, top + 2 - layer * 3)}
          opacity={(0.25 + wave.opacity * 0.5) * (0.6 + wave.depth * 0.4)}
        />
      ))}

      {skyline.map((building, i) => {
        const height = 18 + building.height * 30;
        const x = 8 + i * buildingWidth + buildingWidth * 0.06;
        const width = buildingWidth * 0.88;
        const rows = Math.floor(height / 6);
        const cols = Math.max(1, Math.floor(width / 5));
        const lit = 0.3 + building.tint * 0.4;
        return (
          <g key={i}>
            <rect x={x} y={86 - height} width={width} height={height} fill={hsl(hue + 200 + building.tint * 50, sat * 0.7, top - 6)} />
            {Array.from({ length: rows * cols }, (_, cell) => {
              const row = Math.floor(cell / cols);
              const col = cell % cols;
              if (spread(i * 7 + cell) > lit) return null;
              return (
                <rect
                  key={cell}
                  x={x + (width / cols) * (col + 0.25)}
                  y={86 - height + 3 + row * 6}
                  width={(width / cols) * 0.5}
                  height="2.4"
                  fill={hsl(45, 90, 72)}
                  opacity={0.85}
                />
              );
            })}
          </g>
        );
      })}

      <rect y="86" width="100" height="14" fill={hsl(hue, sat * 0.6, top - 8)} opacity="0.9" />
      {tracks.map((track, row) =>
        track.steps.map((on, step) => (
          <rect
            key={`${row}-${step}`}
            x={12 + step * 4.75}
            y={88 + row * 2.1}
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
