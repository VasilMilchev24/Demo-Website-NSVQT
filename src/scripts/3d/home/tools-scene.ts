/**
 * "Защо да изберете нас" scene: one 3D tool per slide; the active tool swings in, follows the
 * pointer slightly and idles; switching slides morphs to the next tool.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRenderer, measure, watchVisibility } from '../core/renderer';
import { clamp } from '../core/math';
import { NAVY, SKY, createWrench, createLevel, createRoller, createHouse } from './tools';

export interface ToolsScene {
  /** Switches to slide `index`. */
  show(index: number): void;
  /** Active slide + progress (0..1) inside it, from the scroll position. */
  progress(index: number, within: number): void;
}

/** Glossy clear-coated plastic, as in the original. */
const glossy = (color: number, roughness = 0.22, clearcoat = 0.8) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat, clearcoatRoughness: 0.12 });

/** Speckled bump texture for the paint-roller sleeve (generated on a canvas). */
function rollerBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 4000; i++) {
      const v = 100 + Math.random() * 155;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 64, 1.5, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

export function createToolsScene(container: HTMLElement | null): ToolsScene | null {
  if (!container) return null;
  const isNarrow = matchMedia('(max-width: 980px)').matches;
  const renderer = createRenderer(container, { maxPixelRatio: 1.75 });
  if (!renderer) return null;
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 9);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, 6);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.6));

  const rollerSleeve = new THREE.MeshStandardMaterial({ color: SKY, roughness: 1 });
  rollerSleeve.bumpMap = rollerBumpTexture();
  rollerSleeve.bumpScale = 2.5;
  const tools = [
    createWrench(glossy(NAVY, 0.28)),
    createLevel(glossy(SKY, 0.3), glossy(NAVY, 0.35)),
    createRoller(
      rollerSleeve,
      new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.22 }),
      glossy(0xffffff, 0.3),
    ),
    createHouse(glossy(0xffffff, 0.25), glossy(SKY, 0.2), glossy(0xb7c2cf, 0.3)),
  ];

  // each tool sits in its own slot group; userData.s eases 0..1 as it becomes active
  const stack = new THREE.Group();
  scene.add(stack);
  const slots = tools.map((tool, i) => {
    const slot = new THREE.Group();
    slot.add(tool);
    slot.visible = i === 0;
    stack.add(slot);
    return { slot, tool, s: i === 0 ? 1 : 0 };
  });

  let width = 0;
  let height = 0;
  let active = 0;
  let activeProgress = 0;
  let smoothX = 0;
  let smoothY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let running = true;
  const startTime = performance.now();

  function resize() {
    const size = measure(container!);
    if (size.w === width && size.h === height) return;
    width = size.w;
    height = size.h;
    renderer!.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = isNarrow || width / height < 1 ? 13 : 9;
    camera.updateProjectionMatrix();
  }

  addEventListener(
    'pointermove',
    (e) => {
      pointerX = (e.clientX / innerWidth) * 2 - 1;
      pointerY = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  function frame(time: number) {
    if (!running) return;
    requestAnimationFrame(frame);
    resize();
    smoothX += (pointerX - smoothX) * 0.06;
    smoothY += (pointerY - smoothY) * 0.06;
    const seconds = (time - startTime) / 1000;
    slots.forEach((entry, i) => {
      const isActive = i === active;
      entry.s += ((isActive ? 1 : 0) - entry.s) * 0.1;
      entry.slot.visible = entry.s > 0.01;
      if (!entry.slot.visible) return;
      const e = 1 - Math.pow(1 - entry.s, 3);
      entry.slot.scale.setScalar(0.4 + e * 0.6);
      entry.slot.rotation.y =
        (1 - e) * (isActive ? -2.2 : 2.2) + (isActive ? (activeProgress - 0.5) * 2.4 : 0) + smoothX * 0.5;
      entry.slot.rotation.x = smoothY * 0.3 + Math.sin(seconds * 0.9) * 0.04;
      entry.slot.position.y = Math.sin(seconds * 1.1 + i) * 0.08 + (1 - e) * -0.8;
      const bubble = entry.tool.userData['meh'] as THREE.Object3D | undefined;
      if (bubble) bubble.position.x = clamp(-smoothX * 0.18 + Math.sin(seconds) * 0.03, -0.2, 0.2);
    });
    renderer!.render(scene, camera);
  }

  watchVisibility(container, (visible) => {
    if (visible && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!visible) {
      running = false;
    }
  });
  requestAnimationFrame(frame);

  return {
    show(index) {
      active = index;
    },
    progress(index, within) {
      active = index;
      activeProgress = within;
    },
  };
}
