/** Small math helpers shared by the 3D scenes. */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));

/** A point as [x, y, z] in metres (apartment space). */
export type Vec3 = readonly [number, number, number];

/** Hermite smoothstep of `x` between `edge0` and `edge1` (0..1). */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - t * 2);
};
