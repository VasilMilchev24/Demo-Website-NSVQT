/**
 * /konstruktor/ — the 3D apartment that reflects the configurator choices.
 * Typed port of the page-specific scene of the original konstruktor.js; the apartment, renderer and
 * stage materials are the shared modules (token-identical to the original's copies).
 *
 * FIX T-12: with prefers-reduced-motion, camera moves and stage changes snap instead of animating.
 * Auto-rotation stays available because the visitor starts and stops it ("Завърти").
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sharedUniforms } from '../core/stage-material';
import { createRenderer, measure, watchVisibility } from '../core/renderer';
import { clamp } from '../core/math';
import { buildApartment, STAGES, APT_W, APT_D, type Stage } from '../apartment/apartment';
import { prefersReducedMotion } from '../../core/dom';

/** Scope options of the form, and the renovation stages each one turns "new". */
export const SCOPE_STAGES = {
  izkartvane: ['izk'],
  instalatsii: ['ins'],
  dograma: ['dog'],
  zamazki: ['zam'],
  steni: ['boy'],
  nastilki: ['nas'],
  banya: ['ban'],
  darvodelski: ['dar'],
  osvetlenie: ['osv'],
  pochistvane: ['poc'],
} as const satisfies Record<string, readonly Stage[]>;
export type Scope = keyof typeof SCOPE_STAGES;
export type Floor = 'ribena' | 'laminat' | 'granit';
export type View = 'sled' | 'otgore';

export interface ConfiguratorScene {
  /** Shows the selected scope as new (or everything old, for "Преди"). */
  scope(selected: readonly Scope[], before: boolean): void;
  floor(kind: Floor): void;
  walls(color: string): void;
  kitchen(color: string): void;
  view(view: View): void;
  rotate(on: boolean): void;
}

export function createConfiguratorScene(holder: HTMLElement): ConfiguratorScene | null {
  const maybeRenderer = createRenderer(holder, { alpha: true, maxPixelRatio: 1.75 });
  if (!maybeRenderer) {
    holder.classList.add('bez-3d');
    return null;
  }
  const renderer: THREE.WebGLRenderer = maybeRenderer;
  renderer.shadowMap.autoUpdate = true;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 120);
  scene.add(new THREE.HemisphereLight(0xf3f6ff, 0xc8b8a2, 1.05));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.3);
  sun.position.set(APT_W / 2 + 7, 15, APT_D / 2 + 9);
  sun.target.position.set(APT_W / 2, 0, APT_D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 2, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);
  const lamp = new THREE.PointLight(0xffd6a0, 0, 7, 1.6);
  lamp.position.set(4.1, 1.7, 5.4);
  scene.add(lamp);
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.15 }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.22;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  let ready = false;
  let dirty = true;
  const apartment = buildApartment(renderer, {
    onReady: () => {
      ready = true;
      dirty = true;
      holder.classList.add('zhivo');
    },
  });
  scene.add(apartment.group);
  sharedUniforms.uRezhim.value = 0;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(APT_W / 2, 0.4, APT_D / 2);
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.18;
  controls.minDistance = 8;
  controls.maxDistance = 42;
  controls.enablePan = false;
  controls.autoRotateSpeed = 0.8;
  controls.addEventListener('change', () => {
    dirty = true;
  });

  // Stage values: `wanted` is set by the form, `shown` follows it at 0.016 per frame (snaps with reduced motion).
  const wanted = Object.fromEntries(STAGES.map((s) => [s, 1])) as Record<Stage, number>;
  const shown = { ...wanted };
  const setScope = (selected: readonly Scope[], before: boolean) => {
    for (const [scope, stages] of Object.entries(SCOPE_STAGES) as [Scope, readonly Stage[]][])
      for (const s of stages) wanted[s] = before ? 0 : selected.includes(scope) ? 1 : 0;
    wanted.obz = before ? 0 : 1;
    wanted.poc = 1;
    dirty = true;
  };

  let width = 0;
  let height = 0;
  const resize = () => {
    const size = measure(holder);
    if (size.w === width && size.h === height) return;
    width = size.w;
    height = size.h;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, 0, -height * (width / height < 1 ? 0.04 : 0.07), width, height);
    camera.updateProjectionMatrix();
    dirty = true;
  };

  let tween: { from: THREE.Vector3; to: THREE.Vector3; t0: number } | null = null;
  const view = (kind: View) => {
    const t = controls.target;
    const d = width / height < 1 ? 33 : 24.5;
    const to =
      kind === 'otgore'
        ? new THREE.Vector3(t.x + 0.01, t.y + d * 1.02, t.z + 0.6)
        : new THREE.Vector3(t.x + d * 0.42, t.y + d * 0.7, t.z + d * 0.6);
    tween = { from: camera.position.clone(), to, t0: performance.now() };
    dirty = true;
  };

  camera.position.set(APT_W / 2 + 7, 12.5, APT_D / 2 + 10);
  camera.lookAt(controls.target);

  let running = true;
  const frame = (time: number) => {
    if (!running) return;
    requestAnimationFrame(frame);
    resize();
    let moving = false;
    for (const s of STAGES) {
      const delta = wanted[s] - shown[s];
      if (Math.abs(delta) > 0.001) {
        shown[s] = prefersReducedMotion
          ? wanted[s]
          : shown[s] + Math.sign(delta) * Math.min(Math.abs(delta), 0.016);
        apartment.setStage(s, shown[s]);
        moving = true;
      }
    }
    lamp.intensity = clamp((shown.osv - 0.55) * 3) * 6;
    if (tween) {
      const k = prefersReducedMotion ? 1 : Math.min(1, (time - tween.t0) / 900);
      camera.position.lerpVectors(tween.from, tween.to, 1 - Math.pow(1 - k, 3));
      camera.lookAt(controls.target);
      if (k >= 1) tween = null;
      moving = true;
    }
    if (controls.autoRotate) moving = true;
    controls.update();
    if (ready && (dirty || moving)) {
      dirty = false;
      renderer.render(scene, camera);
    }
  };
  watchVisibility(holder, (visible) => {
    if (visible && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!visible) {
      running = false;
    }
  });
  requestAnimationFrame(frame);
  resize();
  view('sled');

  const floorMaps: Record<Floor, THREE.Texture | undefined> = {
    ribena: apartment.textures.parN,
    laminat: apartment.textures.lam,
    granit: apartment.textures.gran,
  };

  return {
    scope: setScope,
    floor(kind) {
      apartment.forEachRecipe('parN', (m) => {
        m.map = floorMaps[kind] ?? null;
        m.normalMap = kind === 'ribena' ? (apartment.textures.parNN ?? null) : null;
        m.roughness = kind === 'granit' ? 0.3 : 0.55;
        m.needsUpdate = true;
      });
      dirty = true;
    },
    walls(color) {
      apartment.forEachRecipe('boya', (m) => m.color.set(color));
      dirty = true;
    },
    kitchen(color) {
      apartment.forEachRecipe('kuhnya', (m) => m.color.set(color));
      dirty = true;
    },
    view,
    rotate(on) {
      controls.autoRotate = on;
      dirty = true;
    },
  };
}
