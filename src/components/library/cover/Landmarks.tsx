import type { ReactNode } from "react";
import type { CoverScene, CoverWorld, Landmark } from "@/songs/cover";
import { GROUND, hsl, spread, wavePath, type Palette } from "./paint";

/** Where landmark `index` of `count` sits: evenly spread across the picture. */
interface Slot {
  x: number;
  width: number;
  index: number;
}

type Draw = (landmark: Landmark, slot: Slot, paint: Palette) => ReactNode;

const WINDOW_LIGHT = hsl(45, 90, 72);

const building: Draw = ({ height: h, tint }, { x, width, index }, { hue, saturation, top }) => {
  const height = 18 + h * 30;
  const w = width * 0.88;
  const left = x + width * 0.06;
  const rows = Math.floor(height / 6);
  const cols = Math.max(1, Math.floor(w / 5));
  const lit = 0.3 + tint * 0.4;
  return (
    <>
      <rect x={left} y={GROUND - height} width={w} height={height} fill={hsl(hue + 200 + tint * 50, saturation * 0.7, top - 6)} />
      {Array.from({ length: rows * cols }, (_, cell) =>
        spread(index * 7 + cell) > lit ? null : (
          <rect
            key={cell}
            x={left + (w / cols) * ((cell % cols) + 0.25)}
            y={GROUND - height + 3 + Math.floor(cell / cols) * 6}
            width={(w / cols) * 0.5}
            height="2.4"
            fill={WINDOW_LIGHT}
            opacity={0.85}
          />
        ),
      )}
    </>
  );
};

const peak: Draw = ({ height: h, tint }, { x, width }, { groundHue, saturation, top }) => {
  const height = 26 + h * 34;
  const middle = x + width / 2;
  const half = width * 0.95;
  const cap = height * 0.22;
  return (
    <>
      <path
        d={`M${middle - half},${GROUND} L${middle},${GROUND - height} L${middle + half},${GROUND} Z`}
        fill={hsl(groundHue + tint * 30, saturation * 0.5, top - 2 + tint * 6)}
      />
      <path
        d={`M${middle},${GROUND - height} L${middle + half * 0.3},${GROUND - height + cap} L${middle},${GROUND - height + cap * 0.75} L${middle - half * 0.3},${GROUND - height + cap} Z`}
        fill="white"
        opacity={0.75}
      />
    </>
  );
};

const pine = (cx: number, base: number, height: number, color: string, key: string) => (
  <g key={key}>
    <rect x={cx - 0.8} y={base - height * 0.18} width="1.6" height={height * 0.18} fill={hsl(25, 35, 18)} />
    {[0, 1, 2].map((tier) => {
      const tierBase = base - height * (0.15 + tier * 0.25);
      const w = height * (0.32 - tier * 0.07);
      return <path key={tier} d={`M${cx - w},${tierBase} L${cx},${tierBase - height * 0.42} L${cx + w},${tierBase} Z`} fill={color} />;
    })}
  </g>
);

const trees: Draw = ({ height: h, tint }, { x, width, index }, { groundHue, saturation, top }) => {
  const height = 20 + h * 30;
  const color = hsl(groundHue + tint * 25, saturation * 0.6, top - 4 + tint * 5);
  return (
    <>
      {pine(x + width * 0.45, GROUND, height, color, "tall")}
      {pine(x + width * (0.85 + spread(index) * 0.2), GROUND, height * 0.6, color, "small")}
    </>
  );
};

const boat: Draw = ({ height: h, tint }, { x, width, index }, { hue, top }) => {
  const sail = 6 + h * 12;
  const cx = x + width / 2;
  const y = 68 + spread(index + 3) * 12;
  return (
    <>
      <path d={`M${cx - 4},${y} L${cx + 4},${y} L${cx + 2.8},${y + 2} L${cx - 2.8},${y + 2} Z`} fill={hsl(hue + 20, 30, top - 8)} />
      <path d={`M${cx},${y - 0.5} L${cx},${y - sail} L${cx + sail * 0.45},${y - 0.5} Z`} fill={hsl(hue + 180 * tint, 45, 85)} opacity={0.9} />
    </>
  );
};

const cactus: Draw = ({ height: h, tint }, { x, width, index }, { groundHue, saturation, top }) => {
  const height = 12 + h * 22;
  const cx = x + width / 2;
  const color = hsl(groundHue + 90 + tint * 20, saturation * 0.5, top - 5);
  const arm = height * (0.35 + spread(index) * 0.2);
  return (
    <g fill={color}>
      <rect x={cx - 1.5} y={GROUND - height} width="3" height={height} rx="1.5" />
      <rect x={cx - 5} y={GROUND - arm - 6} width="2.4" height="6" rx="1.2" />
      <rect x={cx - 5} y={GROUND - arm - 1.2} width="4" height="2.4" rx="1.2" />
      <rect x={cx + 2.6} y={GROUND - arm * 1.3 - 5} width="2.4" height="5" rx="1.2" />
      <rect x={cx + 1} y={GROUND - arm * 1.3 - 1.2} width="4" height="2.4" rx="1.2" />
    </g>
  );
};

const farm: Draw = ({ height: h, tint }, { x, width, index }, { groundHue, saturation, top, hue }) => {
  const cx = x + width / 2;
  if (index % 2 === 1) {
    // A house with a lit window.
    const size = 7 + h * 6;
    return (
      <>
        <rect x={cx - size / 2} y={GROUND - size} width={size} height={size} fill={hsl(hue + 30, 25, top + 18)} />
        <path
          d={`M${cx - size * 0.65},${GROUND - size} L${cx},${GROUND - size * 1.6} L${cx + size * 0.65},${GROUND - size} Z`}
          fill={hsl(hue + 5, 45, top + 2)}
        />
        <rect x={cx - size * 0.15} y={GROUND - size * 0.7} width={size * 0.3} height={size * 0.3} fill={WINDOW_LIGHT} />
      </>
    );
  }
  // A round tree.
  const height = 12 + h * 18;
  return (
    <>
      <rect x={cx - 0.8} y={GROUND - height * 0.5} width="1.6" height={height * 0.5} fill={hsl(25, 35, 22)} />
      <circle cx={cx} cy={GROUND - height * 0.65} r={height * 0.35} fill={hsl(groundHue + tint * 30, saturation * 0.7, top + 4)} />
    </>
  );
};

const DRAW: Record<CoverWorld, Draw> = { city: building, mountains: peak, forest: trees, sea: boat, desert: cactus, fields: farm };

/** Rolling ground behind the landmarks (the sea gets water instead, see `Water`). */
function Hills({ scene, paint }: { scene: CoverScene; paint: Palette }) {
  const { wave } = scene;
  const { groundHue, saturation, top } = paint;
  // Dunes are wide and soft, hills are rounder.
  const scale = scene.world === "desert" ? 0.6 : 1;
  return (
    <>
      {[0, 1, 2].map((layer) => (
        <path
          key={layer}
          d={wavePath(
            50 + layer * 8,
            (1.5 + wave.amplitude * 7) * (scene.world === "desert" ? 1.4 : 1),
            (0.8 + wave.rate * 3 + layer * 0.35) * scale,
            wave.phase * 2 * Math.PI + layer * (0.7 + wave.jitter * 2),
          )}
          fill={hsl(
            groundHue + 25 * (layer + 1) * (scene.world === "city" ? 1 : 0.3),
            saturation * 0.9,
            top + 2 - layer * 3 + (scene.world === "desert" ? 14 : 0),
          )}
          opacity={(0.25 + wave.opacity * 0.5) * (0.6 + wave.depth * 0.4) + (scene.world === "city" ? 0 : 0.25)}
        />
      ))}
    </>
  );
}

/** The sea: a band of water with the sun's reflection and a few wave lines driven by the wobble. */
function Water({ scene, paint }: { scene: CoverScene; paint: Palette }) {
  const { groundHue, saturation, top } = paint;
  const sunX = 22 + scene.sun.x * 56;
  return (
    <>
      <rect y="58" width="100" height={GROUND - 58} fill={hsl(groundHue, saturation * 0.8, top + 2)} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={`r${i}`}
          x={sunX - (8 - i) * (0.6 + scene.sun.size * 0.5)}
          y={61 + i * 4.5}
          width={(8 - i) * (1.2 + scene.sun.size)}
          height="0.9"
          fill="white"
          opacity={0.35 - i * 0.05}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <path
          key={`w${i}`}
          d={wavePath(64 + i * 7, 0.6 + scene.wave.amplitude * 1.5, 3 + scene.wave.rate * 4 + i, scene.wave.phase * 6 + i)
            .replace(/ L100,100 Z$/, "")
            .replace(/^M0,100 L/, "M")}
          fill="none"
          stroke={hsl(groundHue, 40, top + 22)}
          strokeWidth="0.5"
          opacity={0.5}
        />
      ))}
    </>
  );
}

/** The ground of the world and one landmark per chord of the song. */
export function Landmarks({ scene, paint }: { scene: CoverScene; paint: Palette }) {
  const draw = DRAW[scene.world];
  const width = 84 / scene.landmarks.length;
  return (
    <>
      {scene.world === "sea" ? <Water scene={scene} paint={paint} /> : <Hills scene={scene} paint={paint} />}
      {scene.landmarks.map((landmark, index) => (
        <g key={index}>{draw(landmark, { x: 8 + index * width, width, index }, paint)}</g>
      ))}
    </>
  );
}
