/**
 * Home hero: the whole apartment is rendered twice-in-one — old on one side of a diagonal
 * "renovation front", renovated on the other. Scrolling moves the front through the home; a glow
 * band marks it, labels flip from the old to the new state, and on desktop a mouse "lens" peeks
 * at the opposite state.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sharedUniforms } from '../core/stage-material';
import { createRenderer, measure, watchVisibility } from '../core/renderer';
import { lerp, clamp } from '../core/math';
import { buildApartment, APT_W, APT_D, APT_H } from '../apartment/apartment';

/** [anchor point, label before, label after] — verbatim from the original. */
const HERO_LABELS = [
  ['banya', 'Старата баня', 'Баня с хидроизолация'],
  ['tablo', 'Старото табло', 'Ново ел. табло'],
  ['prozorets', 'Дървената дограма', 'Нова дограма'],
  ['spalnya', 'Износен паркет', 'Паркет рибена кост'],
  ['kuhnya', 'Старата кухня', 'Кухня по мярка'],
  ['gips', 'Гола стена', 'Гипсокартон и боя'],
  ['osvetlenie', 'Старата преграда', 'Отворено пространство'],
  ['dnevna', 'Старият диван', 'Обзаведено'],
  ['antre', 'Старото антре', 'Гардероб по мярка'],
] as const;

/** Labels kept visible once the renovation is complete (first 3 on narrow screens). */
const FINAL_LABELS = ['banya', 'kuhnya', 'spalnya', 'osvetlenie', 'dnevna'];

export interface HeroScene {
  /** Renovation progress 0..1 (from the pinned scroll). */
  progress(p: number): void;
}

export interface HeroSceneOptions {
  container: HTMLElement | null;
  labelsLayer: HTMLElement | null;
  lens: HTMLElement | null;
}

export function createHeroScene({ container, labelsLayer, lens }: HeroSceneOptions): HeroScene | null {
  if (!container) return null;
  const box = container;
  const isNarrow = matchMedia('(max-width: 980px)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const renderer = createRenderer(box, { maxPixelRatio: isNarrow ? 2 : 1.75 });
  if (!renderer) {
    box.classList.add('bez-3d'); // CSS keeps the static poster
    return null;
  }
  renderer.shadowMap.autoUpdate = false;

  // --- scene, light, ground shadow --------------------------------------------------------------
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 120);
  scene.add(new THREE.HemisphereLight(0xf3f6ff, 0xc8b8a2, 1.05));
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.3);
  sun.position.set(APT_W / 2 + 7, 15, APT_D / 2 + 9);
  sun.target.position.set(APT_W / 2, 0, APT_D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 2, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const lampLight = new THREE.PointLight(0xffd6a0, 0, 7, 1.6);
  lampLight.position.set(4.1, 1.7, 5.4);
  scene.add(lampLight);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.22;
  ground.receiveShadow = true;
  scene.add(ground);

  let ready = false;
  const apartment = buildApartment(renderer, {
    onReady: () => {
      start();
      renderer.shadowMap.needsUpdate = true;
    },
  });
  scene.add(apartment.group);
  apartment.showAll();
  sharedUniforms.uRezhim.value = 1;

  // --- renovation front: a line in XZ moving along frontDir ------------------------------------
  const frontDir = new THREE.Vector2(1, 0.42).normalize();
  const cornerProjections = (
    [
      [0, 0],
      [APT_W, 0],
      [0, APT_D],
      [APT_W, APT_D],
    ] as const
  ).map(([x, z]) => x * frontDir.x + z * frontDir.y);
  const frontMin = Math.min(...cornerProjections) - 0.35;
  const frontMax = Math.max(...cornerProjections) + 0.35;

  // vertical sky-blue glow plane that travels with the front
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 4;
  glowCanvas.height = 256;
  const glowCtx = glowCanvas.getContext('2d');
  if (glowCtx) {
    const gradient = glowCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, 'rgba(76,172,216,0)');
    gradient.addColorStop(0.55, 'rgba(76,172,216,0.10)');
    gradient.addColorStop(1, 'rgba(76,172,216,0.42)');
    glowCtx.fillStyle = gradient;
    glowCtx.fillRect(0, 0, 4, 256);
  }
  const glowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 3),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  glowPlane.rotation.y = Math.atan2(frontDir.x, frontDir.y) + Math.PI / 2;
  scene.add(glowPlane);
  const frontNormal = new THREE.Vector2(-frontDir.y, frontDir.x);
  const frontCenter = (APT_W / 2) * frontNormal.x + (APT_D / 2) * frontNormal.y;

  let progress = 0;
  function setFront(p: number) {
    const offset = lerp(frontMin, frontMax, p);
    sharedUniforms.uFront.value.set(frontDir.x, frontDir.y, offset);
    glowPlane.position.set(
      frontDir.x * offset + frontNormal.x * frontCenter,
      1.3,
      frontDir.y * offset + frontNormal.y * frontCenter,
    );
    glowPlane.visible = p > 0.005 && p < 0.995;
    lampLight.intensity = clamp((p - 0.6) * 3) * 6;
  }

  // --- camera: orbit around the centre, distance fitted to the free area between text blocks ---
  const target = new THREE.Vector3(APT_W / 2, 0.55, APT_D / 2);
  const boundsCorners = (
    [
      [-0.3, -0.22, -0.3],
      [APT_W + 0.3, -0.22, -0.3],
      [-0.3, -0.22, APT_D + 0.3],
      [APT_W + 0.3, -0.22, APT_D + 0.3],
      [-0.3, APT_H, -0.3],
      [APT_W + 0.3, APT_H, -0.3],
      [-0.3, APT_H, APT_D + 0.3],
      [APT_W + 0.3, 0.95, APT_D + 0.3],
    ] as const
  ).map((c) => new THREE.Vector3(...c));
  let viewport = { x: 0, y: 0, w: 1, h: 1 };
  let azimuth = 0.52;
  let elevation = 0.86;
  let distance = 22;
  let smoothX = 0;
  let smoothY = 0;
  let pointerX = 0;
  let pointerY = 0;
  const tmp = new THREE.Vector3();
  let width = 0;
  let height = 0;

  function placeCamera(dist: number) {
    camera.position.set(
      target.x + dist * Math.sin(azimuth) * Math.cos(elevation),
      target.y + dist * Math.sin(elevation),
      target.z + dist * Math.cos(azimuth) * Math.cos(elevation),
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  /** Binary-searches the closest camera distance at which the whole model fits the free area. */
  function fitCamera() {
    const textBottom =
      document.querySelector('.geroi__tekst')?.getBoundingClientRect().bottom ?? height * 0.3;
    const footerTop = document.querySelector('.geroi__dolu')?.getBoundingClientRect().top ?? height * 0.9;
    const rect = box.getBoundingClientRect();
    const top = Math.max(0, textBottom - rect.top + 6);
    const bottom = Math.min(height, footerTop - rect.top + 26);
    viewport = {
      x: width * (isNarrow ? 0 : 0.03),
      y: top,
      w: width * (isNarrow ? 1 : 0.94),
      h: Math.max(120, bottom - top),
    };
    camera.clearViewOffset();
    const maxX = (viewport.w / width) * 0.98;
    const maxY = (viewport.h / height) * 0.98;
    let lo = 4;
    let hi = 80;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      placeCamera(mid);
      const fits = boundsCorners.every((c) => {
        tmp.copy(c).project(camera);
        return Math.abs(tmp.x) <= maxX && Math.abs(tmp.y) <= maxY;
      });
      if (fits) hi = mid;
      else lo = mid;
    }
    distance = hi;
    camera.setViewOffset(
      width,
      height,
      width / 2 - (viewport.x + viewport.w / 2),
      height / 2 - (viewport.y + viewport.h / 2),
      width,
      height,
    );
  }

  function resize() {
    const size = measure(box);
    if (size.w === width && size.h === height) return;
    width = size.w;
    height = size.h;
    renderer!.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCamera();
    dirty = true;
  }

  // --- labels pinned to 3D points ---------------------------------------------------------------
  const labels = HERO_LABELS.map(([key, before, after]) => {
    const el = document.createElement('span');
    el.className = 'bel3d';
    const text = document.createElement('b');
    el.append(document.createElement('i'), text);
    labelsLayer?.append(el);
    const anchor = apartment.points[key] ?? [0, 0, 0];
    return { key, before, after, el, text, p: new THREE.Vector3(...anchor), state: '' };
  });

  function updateLabels() {
    if (!labelsLayer) return;
    const front = sharedUniforms.uFront.value.z;
    for (const label of labels) {
      tmp.copy(label.p).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * width;
      const sy = (-tmp.y * 0.5 + 0.5) * height;
      const side = label.p.x * frontDir.x + label.p.z * frontDir.y - front;
      const isNew = side < 0;
      const shown =
        progress > 0.97
          ? FINAL_LABELS.slice(0, isNarrow ? 3 : 5).includes(label.key)
          : side > (isNarrow ? -1.4 : -3) && side < (isNarrow ? 0.3 : 0.5) && progress > 0.02;
      const state = (shown ? 'v' : '') + (isNew ? 'n' : 's');
      label.el.style.setProperty('--x', `${sx.toFixed(1)}px`);
      label.el.style.setProperty('--y', `${sy.toFixed(1)}px`);
      if (state !== label.state) {
        label.state = state;
        label.el.classList.toggle('vid', shown);
        label.el.classList.toggle('staro', !isNew);
        label.text.textContent = isNew ? label.after : label.before;
      }
    }
  }

  // --- mouse lens (desktop): peeks at the other side of the front -------------------------------
  let lensX = -9999;
  let lensY = -9999;
  let lensOn = false;
  const lensRadius = isNarrow ? 0 : 128;
  if (canHover && lens) {
    box.addEventListener('pointermove', (e) => {
      const rect = box.getBoundingClientRect();
      lensX = e.clientX - rect.left;
      lensY = e.clientY - rect.top;
      pointerX = (lensX / rect.width) * 2 - 1;
      pointerY = (lensY / rect.height) * 2 - 1;
      lensOn = true;
      dirty = true;
      lens.style.setProperty('--x', `${lensX}px`);
      lens.style.setProperty('--y', `${lensY}px`);
      lens.style.setProperty('--r', `${lensRadius}px`);
      lens.classList.add('vidima');
      const caption = lens.firstElementChild;
      if (caption) caption.textContent = progress > 0.5 ? 'Преди ремонта' : 'След ремонта';
    });
    box.addEventListener('pointerleave', () => {
      lensOn = false;
      pointerX = 0;
      pointerY = 0;
      lens.classList.remove('vidima');
      dirty = true;
    });
  }

  // --- render loop (renders only when something changed) ---------------------------------------
  let dirty = true;
  let running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    resize();
    const dx = pointerX - smoothX;
    const dy = pointerY - smoothY;
    if (Math.abs(dx) + Math.abs(dy) > 0.0005) {
      smoothX += dx * 0.08;
      smoothY += dy * 0.08;
      dirty = true;
    }
    if (!dirty || !ready) return;
    dirty = false;
    azimuth = 0.52 - progress * 0.18 + smoothX * 0.07;
    elevation = 0.86 + smoothY * 0.035;
    placeCamera(distance);
    const pixelRatio = renderer!.getPixelRatio();
    sharedUniforms.uLens.value.set(
      lensX * pixelRatio,
      (height - lensY) * pixelRatio,
      lensRadius * pixelRatio,
      lensOn ? 1 : 0,
    );
    renderer!.shadowMap.needsUpdate = true;
    renderer!.render(scene, camera);
    updateLabels();
  }
  watchVisibility(box, (visible) => {
    if (visible && !running) {
      running = true;
      dirty = true;
      requestAnimationFrame(frame);
    } else if (!visible) {
      running = false;
    }
  });

  /** First render: compile shaders, then fade the canvas in over the poster (CSS class "zhivo"). */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    resize();
    placeCamera(distance);
    const reveal = () => {
      ready = true;
      dirty = true;
      renderer!.render(scene, camera);
      requestAnimationFrame(() => box.classList.add('zhivo'));
    };
    renderer!.compileAsync(scene, camera).then(reveal).catch(reveal);
  }
  setTimeout(start, 6000); // never wait more than 6 s for textures

  const invalidate = () => {
    width = 0;
    dirty = true;
  };
  addEventListener('resize', invalidate);
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(invalidate);
    for (const sel of ['.geroi__tekst', '.geroi__dolu']) {
      const el = document.querySelector(sel);
      if (el) ro.observe(el);
    }
  }
  addEventListener('load', invalidate);
  void document.fonts?.ready.then(invalidate);

  setFront(0);
  requestAnimationFrame(frame);
  return {
    progress(p) {
      progress = p;
      setFront(p);
      dirty = true;
    },
  };
}
