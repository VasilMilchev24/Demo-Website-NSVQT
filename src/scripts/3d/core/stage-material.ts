/**
 * Stage material: a MeshStandardMaterial whose shader animates every part in / out by renovation stage.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 *
 * Each vertex carries (see StageBatcher):
 *   aPiv – pivot point of its part, aT – delay (0..1) inside the stage, aTip – animation style,
 *   aU – progress coordinate for "draw along" styles (pipes, paint).
 * Per-material uniforms: uA = progress of the stage that builds the part, uB = progress of the stage
 * that removes it. Shared uniforms drive the home-hero "renovation front" (old | new split) and lens.
 */
import * as THREE from 'three';

/** How a part animates in (uA) / out (uB). Values are used inside the shader. */
export const StageAnim = {
  /** falls in from above */
  FALL: 0,
  /** grows up from the floor */
  GROW: 1,
  /** scales from its pivot */
  SCALE: 2,
  /** drawn along its path (pipes, cables) */
  PATH: 3,
  /** tile: flips up around its bottom edge */
  FLIP: 4,
  /** slides in from the side */
  SLIDE: 5,
  /** paint: revealed along its surface like a roller */
  PAINT: 6,
  /** debris: falls away when demolished */
  DROP: 7,
  /** wiped away along its surface when demolished */
  WIPE: 8,
} as const;
export type StageAnimType = (typeof StageAnim)[keyof typeof StageAnim];

/** Uniforms shared by every stage material (hero front / lens). */
export const sharedUniforms = {
  /** 1 = split the model along the renovation front (home hero). */
  uRezhim: { value: 0 },
  /** front line in XZ: (dir.x, dir.y, offset) */
  uFront: { value: new THREE.Vector3(1, 0, -100) },
  /** mouse lens in pixels: (x, y, radius, enabled) */
  uLens: { value: new THREE.Vector4(-9999, -9999, 0, 0) },
  /** glow colour at the front line (#4CACD8) */
  uSvetene: { value: new THREE.Color(0x4cacd8) },
  /** half-width of the "band" side */
  uLenta: { value: 1.1 },
  uVreme: { value: 0 },
};

/** Per-material uniforms, also kept on material.userData.u for direct updates. */
export interface StageUniforms {
  uA: { value: number };
  uB: { value: number };
  uRazl: { value: number };
  uTraene: { value: number };
  uStrana: { value: number };
}

/**
 * Which side of the renovation front a material renders (uStrana):
 * 0 = only the old side, 1 = only the new side, 2 = both, 3 = only a band around the front.
 */
export type FrontSide = 0 | 1 | 2 | 3;

const VERTEX_HEAD = /* glsl */ `
attribute vec3 aPiv; attribute float aT; attribute float aTip; attribute float aU;
uniform float uA; uniform float uB; uniform float uRazl; uniform float uTraene;
varying vec3 vW; varying float vU; varying float vKA; varying float vKB; varying float vTip;
float easeOut(float k){ return 1.0 - pow(1.0 - k, 3.0); }
float easeIn(float k){ return k * k * k; }
`;

const VERTEX_BODY = /* glsl */ `
vec3 transformed = vec3(position);
float kA = clamp((uA - aT * uRazl) / uTraene, 0.0, 1.0);
float kB = clamp((uB - aT * uRazl) / uTraene, 0.0, 1.0);
vKA = kA; vKB = kB; vU = aU; vTip = aTip;
float eA = easeOut(kA);
vec3 d = transformed - aPiv;
if (aTip < 0.5) {                 // FALL: drops in from above
  transformed.y += (1.0 - eA) * 1.4;
  transformed = aPiv + d * mix(0.86, 1.0, eA) + vec3(0.0, (1.0 - eA) * 1.4, 0.0);
} else if (aTip < 1.5) {          // GROW: rises from the floor
  transformed.y = aPiv.y + d.y * eA;
} else if (aTip < 2.5) {          // SCALE: from its pivot
  transformed = aPiv + d * eA;
} else if (aTip < 3.5) {          // PATH: cut in the fragment shader
} else if (aTip < 4.5) {          // FLIP: tile turns up around its bottom edge
  float a = (1.0 - eA) * 1.5708;
  float c = cos(a), s = sin(a);
  vec3 q = d; q.yz = vec2(c * d.y - s * d.z, s * d.y + c * d.z);
  transformed = aPiv + q * mix(0.6, 1.0, eA);
} else if (aTip < 5.5) {          // SLIDE: slides in
  transformed.x += (1.0 - eA) * 0.9;
  transformed = mix(aPiv, transformed, max(eA, 0.001));
} else if (aTip < 6.5) {          // PAINT: cut in the fragment shader
}
/* removal: the old part shrinks and sinks */
if (kB > 0.0 && aTip < 6.5 && (aTip < 2.5 || aTip > 3.5)) {
  float eB = easeIn(kB);
  transformed = aPiv + (transformed - aPiv) * (1.0 - eB) - vec3(0.0, eB * 0.25, 0.0);
}
if (aTip > 6.5 && aTip < 7.5) {   // DROP: bricks tumble when the wall is knocked down
  float eB = easeIn(kB);
  transformed += vec3(sin(aT * 91.0) * 0.4, -1.0, cos(aT * 57.0) * 0.4) * eB * 1.2;
  transformed = mix(transformed, aPiv, eB * eB);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uRezhim; uniform vec3 uFront; uniform vec4 uLens; uniform float uStrana; uniform vec3 uSvetene; uniform float uLenta;
varying vec3 vW; varying float vU; varying float vKA; varying float vKB; varying float vTip;
`;

const FRAGMENT_BODY = /* glsl */ `
if (vKA <= 0.0) discard;
if (vTip > 2.5 && vTip < 3.5) { if (vU > vKA) discard; if (vKB > 0.0 && vU < vKB) discard; }
if (vTip > 5.5 && vTip < 6.5) { if (vU > vKA) discard; }
if (vTip > 7.5) { if (vU < vKB) discard; }
if (vKB >= 1.0 && vTip < 6.5) discard;
float sFront = 0.0;
if (uRezhim > 0.5) {
  sFront = dot(vW.xz, uFront.xy) - uFront.z;
  bool nov = sFront < 0.0;
  if (uLens.w > 0.5 && distance(gl_FragCoord.xy, uLens.xy) < uLens.z) nov = !nov;
  if (uStrana < 0.5 && nov) discard;
  if (uStrana > 0.5 && uStrana < 1.5 && !nov) discard;
  if (uStrana > 2.5 && abs(sFront) > uLenta) discard;
}
`;

const EMISSIVE_BODY = /* glsl */ `
if (uRezhim > 0.5) {
  float g = 1.0 - smoothstep(0.0, 0.04, abs(sFront));
  totalEmissiveRadiance += uSvetene * g * 1.6;
}
`;

const WORLD_POSITION = `#include <project_vertex>
vW = (modelMatrix * vec4(transformed, 1.0)).xyz;`;

let nextMaterialId = 0;

export interface StageMaterialOptions {
  side?: FrontSide;
  /** how much of the stage the per-part delays spread over */
  spread?: number;
  /** duration of one part's animation, as a fraction of the stage */
  duration?: number;
}

export type StageMaterial = THREE.MeshStandardMaterial & {
  userData: { u: StageUniforms; dm: THREE.MeshDepthMaterial; id: number; recepta?: string };
};

/** Creates a stage-animated standard material (+ matching depth material for shadows). */
export function createStageMaterial(
  params: THREE.MeshStandardMaterialParameters = {},
  { side = 2, spread = 0.62, duration = 0.38 }: StageMaterialOptions = {},
): StageMaterial {
  const material = new THREE.MeshStandardMaterial(params) as StageMaterial;
  const uniforms: StageUniforms = {
    uA: { value: 1 },
    uB: { value: 0 },
    uRazl: { value: spread },
    uTraene: { value: duration },
    uStrana: { value: side },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, sharedUniforms);
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader
        .replace('#include <begin_vertex>', VERTEX_BODY)
        .replace('#include <project_vertex>', WORLD_POSITION);
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader
        .replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>\n${FRAGMENT_BODY}`,
        )
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${EMISSIVE_BODY}`);
  };
  material.customProgramCacheKey = () => 'stage';

  // Shadows must follow the same animation, but ignore the mouse lens.
  const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, sharedUniforms);
    shader.vertexShader =
      VERTEX_HEAD +
      shader.vertexShader
        .replace('#include <begin_vertex>', VERTEX_BODY)
        .replace('#include <project_vertex>', WORLD_POSITION);
    shader.fragmentShader =
      FRAGMENT_HEAD +
      shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>\n${FRAGMENT_BODY.replace(/uLens\.w > 0\.5 &&/, 'false &&')}`,
      );
  };
  depthMaterial.customProgramCacheKey = () => 'stage-depth';

  material.userData.u = uniforms;
  material.userData.dm = depthMaterial;
  material.userData.id = nextMaterialId++;
  return material;
}
