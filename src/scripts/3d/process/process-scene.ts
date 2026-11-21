/**
 * /proces/ — the apartment is renovated step by step as the page scrolls (12 steps).
 * Typed port of the page-specific part of the original proces.js; the apartment, renderer and
 * stage materials are the shared modules (token-identical to the original's copies).
 *
 * Scroll progress 0..1 over the step articles drives: the renovation stages, a camera that eases
 * between 12 key views, measurement / floor-plan / outline lines on steps 1–3, the evening light
 * on step 10, sparkles on step 12, 3D-pinned labels, the step rail and the big step number.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sharedUniforms } from '../core/stage-material';
import { createRenderer } from '../core/renderer';
import { lerp, clamp, smoothstep, type Vec3 } from '../core/math';
import { buildApartment, STAGES, APT_W, APT_D, APT_H, type Stage } from '../apartment/apartment';
import { $, $$, prefersReducedMotion } from '../../core/dom';
import { lenis, getScroll } from '../../core/motion';

const isNarrow = (): boolean => innerWidth < 980;

/** Renovation stages completed by each of the 12 steps (steps 1–3 are paperwork: none). */
const STEP_STAGES: readonly (readonly Stage[] | null)[] = [
  null,
  null,
  null,
  ['izk'],
  ['ins'],
  ['dog'],
  ['zam'],
  ['nas', 'boy', 'ban'],
  ['dar'],
  ['osv'],
  ['obz'],
  ['poc'],
];

/**
 * Camera key view per step: [target x, y, z, azimuth, elevation, distance factor].
 * Mutable: dragging the canvas turns every view's azimuth (index 3).
 */
const VIEWS: number[][] = [
  [5, 0.4, 3.3, 0.62, 0.9, 1],
  [5, 0, 3.3, 0, 1.45, 1],
  [5, 0.6, 3.3, -0.55, 0.8, 1],
  [5.4, 0.6, 5.2, 0.65, 0.95, 0.66],
  [3.6, 0.6, 2.4, 0.5, 1, 0.78],
  [6.6, 1, 1, 0.1, 0.7, 0.66],
  [7.2, 0.6, 3.6, 1.25, 0.78, 0.64],
  [4.8, 0.2, 3.1, 0.45, 1.1, 0.92],
  [6, 0.8, 1.6, 0.55, 0.88, 0.72],
  [4.4, 0.8, 5, 0.35, 0.78, 0.6],
  [6.4, 0.4, 3.4, 0.8, 0.86, 0.8],
  [5, 0.4, 3.3, 0.55, 0.88, 1],
];

/** 3D-pinned labels per step: [id, text, position]. */
const LABELS: readonly (readonly [string, string, Vec3])[][] = [
  [
    ['m-w', '10,00 м', [5, 0.1, -0.7]],
    ['m-d', '6,60 м', [-0.7, 0.1, 3.3]],
    ['m-h', '2,60 м', [APT_W + 0.5, 1.3, -0.3]],
  ],
  [
    ['s-b', 'Баня · 6,5 м²', [1.27, 0.3, 1.27]],
    ['s-a', 'Антре · 10 м²', [1.27, 0.3, 4.6]],
    ['s-s', 'Спалня · 13,6 м²', [4.3, 0.3, 2.1]],
    ['s-d', 'Дневна с кухня · 26 м²', [8, 0.3, 3.3]],
    ['s-n', 'Ниша · 8 м²', [4.3, 0.3, 5.4]],
  ],
  [['d-1', 'Обхват · срокове · гаранция', [5, 2.9, 3.3]]],
  [
    ['i-1', 'Старата преграда', [6, 1.6, 5.4]],
    ['i-2', 'Извозване', [8.2, 0.9, 3.6]],
  ],
  [
    ['n-1', 'ВиК', [0.3, 0.9, 0.6]],
    ['n-2', 'Ел. табло', [0.1, 1.6, 3.3]],
    ['n-3', 'Канализация', [0.5, 0.2, 1.4]],
  ],
  [
    ['g-1', 'Нова дограма', [4.4, 1.6, 0.1]],
    ['g-2', 'Балконска врата', [9, 1.4, 0.1]],
  ],
  [
    ['z-1', 'Гипсокартон', [6.2, 1.8, 3.3]],
    ['z-2', 'Замазка', [8.4, 0.1, 5.4]],
  ],
  [
    ['p-1', 'Паркет рибена кост', [4.4, 0.1, 2]],
    ['p-2', 'Плочки 60 × 120', [1.2, 1.4, 0.05]],
    ['p-3', 'Боя', [6.2, 1.2, 1.4]],
  ],
  [
    ['k-1', 'Кухня по мярка', [7.4, 1.2, 0.4]],
    ['k-2', 'Гардероб', [3, 1.4, 1.5]],
    ['k-3', 'Рафтове', [5.4, 1.5, 4.4]],
  ],
  [
    ['o-1', 'Висящо тяло', [4.1, 1.5, 5.45]],
    ['o-2', 'Подсветка', [7.5, 1.5, 0.2]],
  ],
  [
    ['b-1', 'Диван', [9.2, 0.8, 3.7]],
    ['b-2', 'Трапезна маса', [4.1, 0.9, 5.45]],
    ['b-3', 'Спалня', [4.7, 0.8, 2.4]],
  ],
  [['c-1', 'Готово за нанасяне', [5, 1, 3.3]]],
];

const BG = 0xeef1f5;
const LINE = 0x4cacd8;

export function initProcessScene(): void {
  const holder = $('#pr-platno');
  const loader = $('#pr-zarezhda');
  const labelsLayer = $('#pr-belezhki');
  if (!holder || !labelsLayer) return;

  const maybeRenderer = createRenderer(holder, { alpha: false, maxPixelRatio: isNarrow() ? 2 : 1.6 });
  if (!maybeRenderer) {
    loader?.remove();
    document.body.classList.add('bez-3d');
    return;
  }
  const renderer: THREE.WebGLRenderer = maybeRenderer;
  renderer.setClearColor(BG, 1);
  renderer.shadowMap.autoUpdate = true;

  // --- scene, lights, ground -------------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 40, 90);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.38;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.2, 200);

  const hemi = new THREE.HemisphereLight(0xf3f6ff, 0xc8b8a2, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e6, 2.3);
  sun.position.set(APT_W / 2 + 7, 15, APT_D / 2 + 9);
  sun.target.position.set(APT_W / 2, 0, APT_D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 2, far: 40 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);
  const lampDining = new THREE.PointLight(0xffc98a, 0, 8, 1.5);
  lampDining.position.set(4.1, 1.6, 5.4);
  scene.add(lampDining);
  const lampKitchen = new THREE.PointLight(0xffc98a, 0, 6, 1.5);
  lampKitchen.position.set(7.6, 1.6, 0.8);
  scene.add(lampKitchen);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xe9edf2, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.22;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- apartment ---------------------------------------------------------------------------------
  let ready = false;
  const apartment = buildApartment(renderer, { onReady: () => start() });
  scene.add(apartment.group);
  sharedUniforms.uRezhim.value = 0;
  apartment.setAll(0);

  // --- step 1–3 overlays: dimensions, floor plan, outline --------------------------------------
  const lineMaterial = (color: number, opacity = 1) =>
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });

  const dimensions = new THREE.Group();
  scene.add(dimensions);
  /** A dimension line from `a` to `b` with end ticks along `tick`. */
  const dimension = (a: Vec3, b: Vec3, tick: Vec3) => {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const t = new THREE.Vector3(...tick).multiplyScalar(0.18);
    const geometry = new THREE.BufferGeometry().setFromPoints([
      from,
      to,
      from.clone().add(t),
      from.clone().sub(t),
      to.clone().add(t),
      to.clone().sub(t),
    ]);
    dimensions.add(new THREE.LineSegments(geometry, lineMaterial(LINE)));
  };
  dimension([0, 0.06, -0.7], [APT_W, 0.06, -0.7], [0, 0, 1]);
  dimension([-0.7, 0.06, 0], [-0.7, 0.06, APT_D], [1, 0, 0]);
  dimension([APT_W + 0.5, 0, -0.3], [APT_W + 0.5, APT_H, -0.3], [1, 0, 0]);

  const plan = new THREE.Group();
  scene.add(plan);
  const rooms: readonly [number, number, number, number][] = [
    [0, 0, 2.54, 2.54],
    [0, 2.66, 2.54, APT_D],
    [2.66, 0, 5.94, 4.14],
    [6.06, 0, APT_W, APT_D],
    [2.66, 4.26, 6.06, APT_D],
  ];
  for (const [x0, z0, x1, z1] of rooms) {
    const y = APT_H + 0.05;
    const corners: [number, number][] = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
      [x0, z0],
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(corners.map(([x, z]) => new THREE.Vector3(x, y, z)));
    plan.add(new THREE.Line(geometry, lineMaterial(LINE)));
  }

  const outline = new THREE.Group();
  scene.add(outline);
  const m = 0.3;
  for (const y of [0.05, APT_H + 0.02]) {
    const corners: [number, number][] = [
      [-m, -m],
      [APT_W + m, -m],
      [APT_W + m, APT_D + m],
      [-m, APT_D + m],
      [-m, -m],
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(corners.map(([x, z]) => new THREE.Vector3(x, y, z)));
    outline.add(new THREE.Line(geometry, lineMaterial(LINE)));
  }

  // --- step 12 sparkles ----------------------------------------------------------------------------
  const sparkleCanvas = document.createElement('canvas');
  sparkleCanvas.width = sparkleCanvas.height = 64;
  const ctx = sparkleCanvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,.9)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (const [x, y] of [
      [32, 0],
      [37, 27],
      [64, 32],
      [37, 37],
      [32, 64],
      [27, 37],
      [0, 32],
      [27, 27],
    ] as const)
      ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
  const sparklePositions: number[] = [];
  for (let i = 0; i < 70; i++)
    sparklePositions.push(
      0.4 + Math.random() * (APT_W - 0.8),
      0.15 + Math.random() * 1.8,
      0.4 + Math.random() * (APT_D - 0.8),
    );
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparklePositions, 3));
  const sparkles = new THREE.Points(
    sparkleGeometry,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(sparkleCanvas),
      size: 0.32,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(sparkles);

  // --- labels ------------------------------------------------------------------------------------
  const labels = LABELS.flatMap((stepLabels, step) =>
    stepLabels.map(([, text, position]) => {
      const el = document.createElement('span');
      el.className = 'bel3d';
      const b = document.createElement('b');
      b.textContent = text;
      el.append(document.createElement('i'), b);
      labelsLayer.append(el);
      return { el, point: new THREE.Vector3(...position), step, visible: false };
    }),
  );

  // --- viewport / camera ---------------------------------------------------------------------------
  let width = 0;
  let height = 0;
  let dirty = true;
  const resize = () => {
    if (innerWidth === width && innerHeight === height) return;
    width = innerWidth;
    height = innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Shift the apartment right of the step cards on desktop, up above them on phones.
    if (width >= 980) camera.setViewOffset(width, height, -width * 0.13, height * 0.02, width, height);
    else camera.setViewOffset(width, height, 0, -height * 0.12, width, height);
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const target = new THREE.Vector3();
  const eye = new THREE.Vector3();
  /** Places the camera between key views `from` and `to` (t = 0..1), plus a small azimuth sway. */
  const placeCamera = (from: number, to: number, t: number, sway: number) => {
    const a = VIEWS[from];
    const b = VIEWS[to];
    if (!a || !b) return;
    const k = t * t * (3 - t * 2);
    const v = (i: number) => lerp(a[i] ?? 0, b[i] ?? 0, k);
    const azimuth = v(3) + sway;
    const elevation = v(4);
    const distance = (width / height < 1 ? 33 : 23) * v(5);
    target.set(v(0), v(1), v(2));
    eye.set(
      target.x + distance * Math.sin(azimuth) * Math.cos(elevation),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(azimuth) * Math.cos(elevation),
    );
    camera.position.copy(eye);
    camera.lookAt(target);
  };

  // --- scroll mapping ------------------------------------------------------------------------------
  const steps = $$<HTMLElement>('.pr-st');
  const count = steps.length;
  const bigNumber = $('[data-golyamo-n]');
  const bigTitle = $('[data-golyamo-t]');
  const railLinks = $$<HTMLAnchorElement>('.pr-nav [data-skok]');
  const railFill = $('.pr-nav__lenta i');
  if (!count) return;

  let shown = 0; // eased progress
  let wanted = 0; // scroll progress
  let currentStep = -1;
  let showFinished = false; // "Готовото" toggle

  let start0 = 0;
  let end0 = 1;
  const measureRange = () => {
    const first = steps[0];
    const last = steps[count - 1];
    if (!first || !last) return;
    start0 = first.getBoundingClientRect().top + scrollY - innerHeight * 0.55;
    end0 = last.getBoundingClientRect().bottom + scrollY - innerHeight * 0.95;
  };
  addEventListener('resize', measureRange);
  addEventListener('load', measureRange);
  void document.fonts?.ready.then(measureRange);
  setTimeout(measureRange, 600);
  measureRange();

  const readScroll = () => {
    wanted = clamp((getScroll() - start0) / Math.max(1, end0 - start0));
  };

  const update = (p: number): number => {
    const pos = p * count;
    const step = Math.min(count - 1, Math.floor(pos));
    const local = clamp(pos - step);

    // stage progress for this scroll position
    const values = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
    STEP_STAGES.forEach((stages, i) => {
      if (!stages) return;
      const value = i < step ? 1 : i > step ? 0 : smoothstep(0.05, 0.72, local);
      for (const s of stages) values[s] = Math.max(values[s], value);
    });
    if (showFinished) for (const s of STAGES) values[s] = 1;
    for (const s of STAGES) if (Math.abs(apartment.progress[s] - values[s]) > 0.0005) apartment.setStage(s, values[s]);

    const sway = prefersReducedMotion ? 0 : Math.sin(p * Math.PI * 3) * 0.04;
    if (showFinished) placeCamera(11, 11, 0, sway);
    else placeCamera(step, Math.min(count - 1, step + 1), smoothstep(0.8, 1, local), sway);

    // overlays of steps 1–3 fade in and out within their step
    const overlay = (i: number) => (step === i ? smoothstep(0, 0.25, local) * (1 - smoothstep(0.8, 1, local)) : 0);
    const setGroup = (group: THREE.Group, i: number) => {
      for (const child of group.children) ((child as THREE.Line).material as THREE.LineBasicMaterial).opacity = overlay(i);
      group.visible = step === i && !showFinished;
    };
    setGroup(dimensions, 0);
    setGroup(plan, 1);
    setGroup(outline, 2);

    // evening light on step 10 (lighting), kept at half afterwards
    const dusk = step === 9 ? smoothstep(0.15, 0.6, local) * (1 - smoothstep(0.85, 1, local) * 0.5) : step > 9 ? 0.5 : 0;
    hemi.intensity = 1.05 - dusk * 0.5;
    sun.intensity = 2.3 - dusk * 1.4;
    lampDining.intensity = values.osv * 7;
    lampKitchen.intensity = values.osv * 4;
    renderer.setClearColor(new THREE.Color(BG).lerp(new THREE.Color(0xc9d0db), dusk), 1);

    const sparkleMaterial = sparkles.material;
    sparkleMaterial.opacity = step === 11 ? Math.sin(Math.PI * smoothstep(0.2, 0.95, local)) : 0;
    sparkles.visible = sparkleMaterial.opacity > 0.01;

    if (step !== currentStep) {
      currentStep = step;
      if (bigNumber) bigNumber.textContent = String(step + 1).padStart(2, '0');
      if (bigTitle) bigTitle.textContent = $('h2', steps[step])?.textContent ?? '';
      railLinks.forEach((a, i) => a.classList.toggle('akt', i === step));
      steps.forEach((s, i) => s.classList.toggle('akt', i === step));
      railLinks[step]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    railFill?.style.setProperty('--p', p.toFixed(4));
    return step;
  };

  const projected = new THREE.Vector3();
  const placeLabels = (step: number) => {
    for (const label of labels) {
      const visible = !showFinished && label.step === step;
      projected.copy(label.point).project(camera);
      label.el.style.setProperty('--x', ((projected.x * 0.5 + 0.5) * width).toFixed(1) + 'px');
      label.el.style.setProperty('--y', ((-projected.y * 0.5 + 0.5) * height).toFixed(1) + 'px');
      if (visible !== label.visible) {
        label.visible = visible;
        label.el.classList.toggle('vid', visible);
      }
    }
  };

  // --- loop ----------------------------------------------------------------------------------------
  let sparkleTime = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    resize();
    readScroll();
    const delta = wanted - shown;
    if (Math.abs(delta) > 0.00005) {
      shown += delta * (prefersReducedMotion ? 1 : 0.12);
      dirty = true;
    }
    if (sparkles.visible) {
      sparkleTime += 0.016;
      sparkles.rotation.y = Math.sin(sparkleTime * 0.3) * 0.01;
      dirty = true;
    }
    if (!ready || !dirty) return;
    dirty = false;
    const step = update(shown);
    renderer.render(scene, camera);
    placeLabels(step);
  };

  /** First frame: compile every material (finished state), then reveal the scene. */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    resize();
    apartment.setAll(1);
    placeCamera(11, 11, 0, 0);
    const reveal = () => {
      renderer.render(scene, camera);
      apartment.setAll(0);
      ready = true;
      dirty = true;
      loader?.classList.add('gotovo');
      setTimeout(() => loader?.remove(), 900);
      document.body.classList.add('pr-gotovo');
    };
    renderer.compileAsync(scene, camera).then(reveal, reveal);
  }
  // Textures can fail to load; show the scene anyway after 8 s, as the original did.
  setTimeout(start, 8000);
  requestAnimationFrame(frame);

  // --- controls ------------------------------------------------------------------------------------
  railLinks.forEach((link) =>
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const index = Number(link.dataset['skok']);
      const top = start0 + ((index + 0.35) / count) * (end0 - start0);
      if (lenis) lenis.scrollTo(top, { duration: 1.6 });
      else scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }),
  );

  const viewButtons = $$<HTMLButtonElement>('[data-izgled]');
  viewButtons.forEach((button) =>
    button.addEventListener('click', () => {
      showFinished = button.dataset['izgled'] === 'sled';
      viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      dirty = true;
    }),
  );

  // Drag sideways to turn the apartment.
  let dragX: number | null = null;
  holder.addEventListener('pointerdown', (e) => {
    dragX = e.clientX;
  });
  addEventListener('pointerup', () => {
    dragX = null;
  });
  addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    const dx = (e.clientX - dragX) / innerWidth;
    dragX = e.clientX;
    for (const view of VIEWS) view[3] = (view[3] ?? 0) + dx * 1.2;
    dirty = true;
  });
}
