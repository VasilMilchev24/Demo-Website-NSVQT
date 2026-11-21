/** Small math helpers shared by the 3D scenes. */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));

/** A point as [x, y, z] in metres (apartment space). */
export type Vec3 = readonly [number, number, number];
