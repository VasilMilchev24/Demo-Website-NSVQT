/**
 * Geometry helpers: parts are placed by their extents (x0..x1, y0..y1, z0..z1, metres) and get
 * world-scaled UVs, so textures keep a constant size regardless of the part's dimensions.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Vec3 } from './math';

/** Axis-aligned box between two corners; UVs are scaled to metres / uvScale. */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, uvScale = 1) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes['uv'] as THREE.BufferAttribute;
  // face order of BoxGeometry: +x, -x, +y, -y, +z, -z
  const faceSizes: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  faceSizes.forEach(([su, sv], face) => {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v;
      uv.setXY(i, (uv.getX(i) * su) / uvScale, (uv.getY(i) * sv) / uvScale);
    }
  });
  geo.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return geo;
}

/** Box with rounded edges between two corners. */
export function roundedBox(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  radius = 0.03,
  segments = 2,
) {
  const w = x1 - x0;
  const h = y1 - y0;
  const d = z1 - z0;
  const geo = new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2.1, h / 2.1, d / 2.1));
  geo.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return geo;
}

/** Vertical cylinder standing on (x, y, z). */
export function cylinder(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  segments = 20,
  radiusTop = radius,
) {
  const geo = new THREE.CylinderGeometry(radiusTop, radius, height, segments);
  geo.translate(x, y + height / 2, z);
  return geo;
}

/** Facing direction of a flat surface. */
export type PlaneAxis = '+x' | '-x' | '+y' | '+z' | '-z';

/**
 * Flat rectangle facing `axis`, at `offset` along that axis, spanning a0..a1 (horizontal)
 * and b0..b1 (vertical, or depth for "+y"). UVs continue across neighbouring planes.
 */
export function plane(
  axis: PlaneAxis,
  offset: number,
  a0: number,
  a1: number,
  b0: number,
  b1: number,
  uvScale = 1,
) {
  const w = a1 - a0;
  const h = b1 - b0;
  const geo = new THREE.PlaneGeometry(w, h);
  const uv = geo.attributes['uv'] as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) * w + a0) / uvScale, (uv.getY(i) * h + b0) / uvScale);
  }
  switch (axis) {
    case '+z':
      geo.translate(a0 + w / 2, b0 + h / 2, offset);
      break;
    case '-z':
      geo.rotateY(Math.PI);
      geo.translate(a0 + w / 2, b0 + h / 2, offset);
      break;
    case '+x':
      geo.rotateY(Math.PI / 2);
      geo.translate(offset, b0 + h / 2, a0 + w / 2);
      break;
    case '-x':
      geo.rotateY(-Math.PI / 2);
      geo.translate(offset, b0 + h / 2, a0 + w / 2);
      break;
    case '+y':
      geo.rotateX(-Math.PI / 2);
      geo.translate(a0 + w / 2, offset, b0 + h / 2);
      break;
  }
  return geo;
}

/** Pipe / cable along a polyline. */
export function tube(points: readonly Vec3[], radius: number, radialSegments = 8) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a && b) path.add(new THREE.LineCurve3(new THREE.Vector3(...a), new THREE.Vector3(...b)));
  }
  const segments = Math.max(8, Math.round(path.getLength() * 6));
  return new THREE.TubeGeometry(path, segments, radius, radialSegments, false);
}
