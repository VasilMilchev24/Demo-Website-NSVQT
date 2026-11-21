/**
 * Collects geometry per (stage key, material) with per-vertex animation attributes, then merges each
 * group into a single mesh (hundreds of parts → a few dozen draw calls).
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StageAnim, type StageAnimType, type StageMaterial } from './stage-material';
import type { Vec3 } from './math';

/** "Draw along" coordinate source for PATH / PAINT / WIPE styles, or a constant. */
export type ProgressAxis = 'x' | 'y' | 'z' | 'uvx' | number | null;

export interface PartOptions {
  /** pivot the part animates around (default: bottom-centre of its bounds) */
  piv?: Vec3 | null;
  /** delay inside the stage, 0..1 */
  t?: number;
  /** animation style */
  tip?: StageAnimType;
  /** progress coordinate for draw-along styles */
  u?: ProgressAxis;
}

const KEEP = new Set(['position', 'normal', 'uv', 'aPiv', 'aT', 'aTip', 'aU']);

export class StageBatcher {
  private readonly groups = new Map<
    string,
    { stage: string; material: StageMaterial; geos: THREE.BufferGeometry[] }
  >();

  /** Adds one part. `stage` is a key like "zam>" (appears with stage zam) or ">izk" (removed by izk). */
  add(
    stage: string,
    material: StageMaterial,
    geo: THREE.BufferGeometry,
    { piv = null, t = 0, tip = StageAnim.SCALE, u = null }: PartOptions = {},
  ) {
    const count = geo.attributes['position']!.count;
    let pivot = piv;
    if (!pivot) {
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      pivot = [(b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2];
    }
    let min = 0;
    let max = 1;
    if (u === 'x' || u === 'y' || u === 'z') {
      geo.computeBoundingBox();
      min = geo.boundingBox!.min[u];
      max = geo.boundingBox!.max[u];
    }
    const aPiv = new Float32Array(count * 3);
    const aT = new Float32Array(count);
    const aTip = new Float32Array(count);
    const aU = new Float32Array(count);
    const position = geo.attributes['position'] as THREE.BufferAttribute;
    const uv = geo.attributes['uv'] as THREE.BufferAttribute | undefined;
    for (let i = 0; i < count; i++) {
      aPiv.set(pivot, i * 3);
      aT[i] = t;
      aTip[i] = tip;
      if (u === 'uvx') aU[i] = uv ? uv.getX(i) : 0;
      else if (u === 'x' || u === 'y' || u === 'z') {
        const value = u === 'x' ? position.getX(i) : u === 'y' ? position.getY(i) : position.getZ(i);
        aU[i] = (value - min) / Math.max(0.0001, max - min);
      } else aU[i] = typeof u === 'number' ? u : -1;
    }
    geo.setAttribute('aPiv', new THREE.BufferAttribute(aPiv, 3));
    geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
    geo.setAttribute('aTip', new THREE.BufferAttribute(aTip, 1));
    geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
    // geometries can only be merged when they share exactly the same attributes
    for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
    if (!geo.attributes['uv'])
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    if (!geo.attributes['normal']) geo.computeVertexNormals();

    const key = `${stage}|${material.userData.id}`;
    let group = this.groups.get(key);
    if (!group) {
      group = { stage, material, geos: [] };
      this.groups.set(key, group);
    }
    group.geos.push(geo.index ? geo.toNonIndexed() : geo);
  }

  /** Merges everything into meshes added to `parent`; returns the meshes per stage key. */
  build(parent: THREE.Object3D, { shadows = true } = {}) {
    const byStage = new Map<string, THREE.Mesh[]>();
    for (const { stage, material, geos } of this.groups.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material);
      mesh.customDepthMaterial = material.userData.dm;
      mesh.castShadow = shadows && !material.transparent;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData['stage'] = stage;
      parent.add(mesh);
      const list = byStage.get(stage) ?? [];
      list.push(mesh);
      byStage.set(stage, list);
    }
    return byStage;
  }
}
