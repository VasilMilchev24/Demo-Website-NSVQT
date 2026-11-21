/**
 * The procedural two-room apartment (10 × 6.6 × 2.6 m) with every renovation stage modelled.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { StageAnim, createStageMaterial, type FrontSide, type StageMaterial } from '../core/stage-material';
import { box, roundedBox, cylinder, plane, tube } from '../core/geometry';
import { StageBatcher, type PartOptions } from '../core/stage-batcher';
import { loadTextures } from '../core/renderer';
import { clamp, type Vec3 } from '../core/math';
import type { PlaneAxis } from '../core/geometry';

/**
 * Renovation stages in order: izk = demolition, ins = installations, dog = windows, zam = screeds &
 * drywall, nas = flooring, boy = paint, ban = bathroom, dar = carpentry, osv = lighting,
 * obz = furnishing, poc = final cleaning.
 */
export const STAGES = ['izk', 'ins', 'dog', 'zam', 'nas', 'boy', 'ban', 'dar', 'osv', 'obz', 'poc'] as const;
export type Stage = (typeof STAGES)[number];
/** Apartment width (x), depth (z) and height (y) in metres; wall thickness; window sill height. */
export const APT_W = 10;
export const APT_D = 6.6;
export const APT_H = 2.6;
const WALL_T = 0.25;
const SILL_H = 0.95;
/** Builds the apartment; `onReady` fires when all textures have loaded. */
export function buildApartment(
  renderer: THREE.WebGLRenderer,
  { texturePath = '/assets/img/3d/', onReady }: { texturePath?: string; onReady?: () => void } = {},
) {
  const tex = loadTextures(
    renderer,
    [
      ['tuhla', texturePath + 'tuhla.jpg', true],
      ['tuhlaN', texturePath + 'tuhla-n.jpg'],
      ['beton', texturePath + 'beton.jpg', true],
      ['mazS', texturePath + 'mazilka-stara.jpg', true],
      ['mazSN', texturePath + 'mazilka-stara-n.jpg'],
      ['boyaN', texturePath + 'boya-n.jpg'],
      ['parN', texturePath + 'parket-nov.jpg', true],
      ['parNN', texturePath + 'parket-nov-n.jpg'],
      ['parS', texturePath + 'parket-star.jpg', true],
      ['parSN', texturePath + 'parket-star-n.jpg'],
      ['lam', texturePath + 'laminat.jpg', true],
      ['gran', texturePath + 'granitogres.jpg', true],
      ['plN', texturePath + 'plochki-novi.jpg', true],
      ['plS', texturePath + 'plochki-stari.jpg', true],
      ['tukan', texturePath + 'tukan.jpg', true],
      ['darvo', texturePath + 'darvo.jpg', true],
      ['darvoT', texturePath + 'darvo-tamno.jpg', true],
    ],
    onReady,
  );
  /** Material recipes by name (MeshStandardMaterial parameters). */
  const recipes: Record<string, THREE.MeshStandardMaterialParameters> = {
    tuhla: {
      map: tex.tuhla,
      normalMap: tex.tuhlaN,
      roughness: 0.92,
      normalScale: new THREE.Vector2(0.8, 0.8),
    },
    rez: {
      color: 12088154,
      roughness: 0.95,
    },
    beton: {
      map: tex.beton,
      color: 14277078,
      roughness: 0.96,
    },
    zamazka: {
      map: tex.beton,
      color: 12896204,
      roughness: 0.9,
    },
    mazS: {
      map: tex.mazS,
      normalMap: tex.mazSN,
      roughness: 0.95,
    },
    grund: {
      color: 15000800,
      roughness: 0.97,
    },
    boya: {
      color: 16052974,
      normalMap: tex.boyaN,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.88,
    },
    boyaAkt: {
      color: 13227747,
      normalMap: tex.boyaN,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.88,
    },
    parN: {
      map: tex.parN,
      normalMap: tex.parNN,
      roughness: 0.5,
      normalScale: new THREE.Vector2(0.7, 0.7),
      color: 16183270,
    },
    parS: {
      map: tex.parS,
      normalMap: tex.parSN,
      roughness: 0.8,
      color: 14208964,
    },
    plN: {
      map: tex.plN,
      roughness: 0.22,
      metalness: 0,
    },
    plS: {
      map: tex.plS,
      roughness: 0.55,
      color: 15918802,
    },
    darvo: {
      map: tex.darvo,
      color: 15784376,
      roughness: 0.62,
    },
    darvoT: {
      map: tex.darvoT,
      color: 10123874,
      roughness: 0.7,
    },
    kuhnya: {
      color: 11122080,
      roughness: 0.6,
    },
    plot: {
      color: 15592422,
      roughness: 0.35,
    },
    byalo: {
      color: 16053489,
      roughness: 0.5,
    },
    keramika: {
      color: 16250869,
      roughness: 0.12,
    },
    hrom: {
      color: 14278114,
      metalness: 1,
      roughness: 0.18,
    },
    cherno: {
      color: 2500652,
      roughness: 0.45,
    },
    chernoMat: {
      color: 3356219,
      roughness: 0.8,
    },
    tamnoSivo: {
      color: 4935768,
      roughness: 0.75,
    },
    pvc: {
      color: 16185076,
      roughness: 0.4,
    },
    staroDarvo: {
      color: 8017722,
      roughness: 0.8,
    },
    staklo: {
      color: 13624303,
      roughness: 0.05,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    },
    sinya: {
      color: 3112912,
      roughness: 0.45,
    },
    chervena: {
      color: 13649210,
      roughness: 0.45,
    },
    kanal: {
      color: 9476000,
      roughness: 0.6,
    },
    gofre: {
      color: 9278622,
      roughness: 0.7,
    },
    kutiyaEl: {
      color: 15788250,
      roughness: 0.7,
    },
    profil: {
      color: 12172997,
      metalness: 0.7,
      roughness: 0.35,
    },
    gips: {
      color: 15198179,
      roughness: 0.92,
    },
    sofa: {
      map: tex.tukan,
      color: 3107438,
      roughness: 0.95,
    },
    gorchitsa: {
      map: tex.tukan,
      color: 14263098,
      roughness: 0.95,
    },
    legloTapitsiraNo: {
      map: tex.tukan,
      color: 9214376,
      roughness: 0.95,
    },
    chearshaf: {
      color: 15921388,
      roughness: 0.9,
    },
    kilim: {
      map: tex.tukan,
      color: 15129805,
      roughness: 1,
    },
    kilim2: {
      map: tex.tukan,
      color: 10465987,
      roughness: 1,
    },
    rastenie: {
      color: 5209420,
      roughness: 0.8,
    },
    savad: {
      color: 14209994,
      roughness: 0.85,
    },
    stariMebeli: {
      color: 13219740,
      roughness: 0.8,
    },
    staraSofa: {
      map: tex.tukan,
      color: 9071186,
      roughness: 0.95,
    },
    otpadak: {
      color: 11111288,
      roughness: 1,
    },
    torba: {
      color: 15921902,
      roughness: 0.9,
    },
    kofa: {
      color: 16250869,
      roughness: 0.5,
    },
    kofaSinya: {
      color: 5024984,
      roughness: 0.5,
    },
    svetlina: {
      color: 16773592,
      emissive: 16767392,
      emissiveIntensity: 0,
      roughness: 0.6,
    },
    led: {
      color: 16774886,
      emissive: 16769712,
      emissiveIntensity: 0,
      roughness: 0.4,
    },
    prah: {
      color: 14209736,
      roughness: 1,
    },
    lampaShir: {
      color: 2829617,
      roughness: 0.5,
      side: THREE.DoubleSide,
    },
    tv: {
      color: 1382170,
      roughness: 0.25,
      metalness: 0.2,
    },
  };
  const materialCache = new Map<string, StageMaterial>();
  const material = (name: string): StageMaterial => {
    let m = materialCache.get(name);
    if (!m) {
      m = createStageMaterial({ ...recipes[name] });
      m.userData.recepta = name;
      materialCache.set(name, m);
    }
    return m;
  };
  const batcher = new StageBatcher();
  /** Adds a part: stage key, material recipe, geometry, animation options. */
  const add = (C: string, L: string, O: THREE.BufferGeometry, k?: PartOptions) =>
    batcher.add(C, material(L), O, k);
  /** Anchor points of the hero labels, by name. */
  const points: Record<string, Vec3> = {};
  add('obv', 'beton', box(-WALL_T, -0.22, -WALL_T, APT_W + WALL_T, 0, APT_D + WALL_T, 1.6));
  type WallFace = [axis: PlaneAxis, offset: number, a0: number, a1: number, room: string];
  /** Inner faces of the walls, finished per room (plaster, primer, paint / tiles). */
  const wallFaces: {
    os: PlaneAxis;
    k: number;
    a0: number;
    a1: number;
    b0: number;
    b1: number;
    staya: string;
  }[] = [];
  /** A brick wall segment between (x0,z0)-(x1,z1), height y0..y1, with its finished faces. */
  function wall(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, faces: WallFace[]) {
    add('obv', 'tuhla', box(x0, y0, z0, x1, y1, z1, 1));
    if (y1 - y0 > 0.15) {
      add('obv', 'rez', box(x0 + 0.005, y1 - 0.004, z0 + 0.005, x1 - 0.005, y1 + 0.002, z1 - 0.005));
    }
    for (const [Yt, Xt, Y, tt, ft] of faces) {
      wallFaces.push({
        os: Yt,
        k: Xt,
        a0: Y,
        a1: tt,
        b0: y0,
        b1: y1,
        staya: ft,
      });
    }
  }
  /** Window openings in the front wall: [x0, x1, y0, y1]. */
  const windowA = [3.7, 5.1, 0.85, 2.25] as const;
  const windowB = [8.5, 9.5, 0, 2.3] as const;
  wall(-WALL_T, -WALL_T, windowA[0], 0, 0, APT_H, [
    ['+z', 0, 0, 2.54, 'banya'],
    ['+z', 0, 2.66, windowA[0], 'spalnya'],
  ]);
  wall(windowA[0], -WALL_T, windowA[1], 0, 0, windowA[2], [['+z', 0, windowA[0], windowA[1], 'spalnya']]);
  wall(windowA[0], -WALL_T, windowA[1], 0, windowA[3], APT_H, [['+z', 0, windowA[0], windowA[1], 'spalnya']]);
  wall(windowA[1], -WALL_T, windowB[0], 0, 0, APT_H, [
    ['+z', 0, windowA[1], 5.94, 'spalnya'],
    ['+z', 0, 6.06, windowB[0], 'dnevna'],
  ]);
  wall(windowB[0], -WALL_T, windowB[1], 0, windowB[3], APT_H, [['+z', 0, windowB[0], windowB[1], 'dnevna']]);
  wall(windowB[1], -WALL_T, APT_W + WALL_T, 0, 0, APT_H, [['+z', 0, windowB[1], APT_W, 'dnevna']]);
  wall(-WALL_T, 0, 0, APT_D, 0, APT_H, [
    ['+x', 0, 0, 2.54, 'banya'],
    ['+x', 0, 2.66, APT_D, 'antre'],
  ]);
  wall(-WALL_T, APT_D, 0.9, APT_D + WALL_T, 0, SILL_H, [['-z', APT_D, 0, 0.9, 'antre']]);
  wall(1.9, APT_D, APT_W + WALL_T, APT_D + WALL_T, 0, SILL_H, [
    ['-z', APT_D, 1.9, 2.54, 'antre'],
    ['-z', APT_D, 2.66, APT_W, 'dnevna'],
  ]);
  wall(APT_W, 0, APT_W + WALL_T, APT_D, 0, SILL_H, [['-x', APT_W, 0, APT_D, 'dnevna']]);
  const partitionX0 = 2.54;
  const partitionX1 = 2.66;
  wall(partitionX0, 0, partitionX1, 3.05, 0, APT_H, [
    ['-x', partitionX0, 0, 2.54, 'banya'],
    ['-x', partitionX0, 2.66, 3.05, 'antre'],
    ['+x', partitionX1, 0, 3.05, 'spalnya'],
  ]);
  wall(partitionX0, 3.05, partitionX1, 3.85, 2.05, APT_H, []);
  wall(partitionX0, 3.85, partitionX1, 4.7, 0, APT_H, [
    ['-x', partitionX0, 3.85, 4.7, 'antre'],
    ['+x', partitionX1, 3.85, 4.14, 'spalnya'],
    ['+x', partitionX1, 4.26, 4.7, 'dnevna'],
  ]);
  wall(partitionX0, 4.7, partitionX1, 5.7, 2.05, APT_H, []);
  wall(partitionX0, 5.7, partitionX1, APT_D, 0, APT_H, [
    ['-x', partitionX0, 5.7, APT_D, 'antre'],
    ['+x', partitionX1, 5.7, APT_D, 'dnevna'],
  ]);
  wall(0, 2.54, 1, 2.66, 0, APT_H, [
    ['-z', 2.54, 0, 1, 'banya'],
    ['+z', 2.66, 0, 1, 'antre'],
  ]);
  wall(1, 2.54, 1.8, 2.66, 2.05, APT_H, []);
  wall(1.8, 2.54, partitionX0, 2.66, 0, APT_H, [
    ['-z', 2.54, 1.8, partitionX0, 'banya'],
    ['+z', 2.66, 1.8, partitionX0, 'antre'],
  ]);
  wall(partitionX1, 4.14, 6.06, 4.26, 0, APT_H, [
    ['-z', 4.14, partitionX1, 5.94, 'spalnya'],
    ['+z', 4.26, partitionX1, 5.94, 'dnevna'],
  ]);
  wall(5.94, 0, 6.06, 4.14, 0, APT_H, [
    ['-x', 5.94, 0, 4.14, 'spalnya'],
    ['+x', 6.06, 0, 4.14, 'dnevna'],
  ]);
  {
    for (let L = 0; L < 26; L++) {
      const k = Math.floor(L / 2);
      const et = k * (APT_H / 13);
      const j = 4.26 + ((L % 2) * (APT_D - 4.26)) / 2;
      const Ct = j + (APT_D - 4.26) / 2;
      add('>izk', 'tuhla', box(5.94, et, j, 6.06, et + APT_H / 13, Ct, 1), {
        tip: StageAnim.DROP,
        t: 1 - k / 13,
        piv: [6, 0, (j + Ct) / 2],
      });
    }
    for (const [L, O] of [
      ['-x', 5.94],
      ['+x', 6.06],
    ] as const) {
      add('>izk', 'mazS', plane(L, O + (L === '+x' ? 0.006 : -0.006), 4.26, APT_D, 0, APT_H, 1.5), {
        tip: StageAnim.WIPE,
        u: 'y',
      });
    }
  }
  for (const C of wallFaces) {
    const L = C.os[0] === '+' ? 1 : -1;
    /** position just in front of the wall face (d = distance from it) */
    const O = (d: number) => C.k + L * d;
    const k = C.b1;
    if (C.staya === 'banya') {
      add('>izk', 'plS', plane(C.os, O(0.008), C.a0, C.a1, 0, Math.min(1.5, k), 1.2), {
        tip: StageAnim.WIPE,
        u: 'y',
      });
      if (k > 1.5) {
        add('>izk', 'mazS', plane(C.os, O(0.007), C.a0, C.a1, 1.5, k, 1.5), {
          tip: StageAnim.WIPE,
          u: 'y',
        });
      }
      add('zam>', 'grund', plane(C.os, O(0.006), C.a0, C.a1, 0, k, 1), {
        tip: StageAnim.PAINT,
        u: 'y',
      });
      const j = 0.6;
      const Ct = 1.2;
      for (let Yt = C.a0; Yt < C.a1 - 0.01; Yt += j) {
        for (let Xt = 0; Xt < k - 0.01; Xt += Ct) {
          const Y = Math.min(C.a1, Yt + j);
          const tt = Math.min(k, Xt + Ct);
          const ft = plane(C.os, O(0.014), Yt + 0.002, Y - 0.002, Xt + 0.002, tt - 0.002, 1.2);
          const Vt: Vec3 = C.os[1] === 'x' ? [O(0.014), Xt, (Yt + Y) / 2] : [(Yt + Y) / 2, Xt, O(0.014)];
          add('ban>', 'plN', ft, {
            tip: StageAnim.FLIP,
            t: clamp((Xt / 2.6) * 0.5 + ((Yt - C.a0) / 2.6) * 0.5),
            piv: Vt,
          });
        }
      }
      continue;
    }
    add('>izk', 'mazS', plane(C.os, O(0.007), C.a0, C.a1, C.b0, k, 1.5), {
      tip: StageAnim.WIPE,
      u: 'y',
    });
    add('zam>', 'grund', plane(C.os, O(0.006), C.a0, C.a1, C.b0, k, 1), {
      tip: StageAnim.PAINT,
      u: 'y',
    });
    const et = C.staya === 'spalnya' && C.os === '-x';
    add('boy>', et ? 'boyaAkt' : 'boya', plane(C.os, O(0.01), C.a0, C.a1, C.b0, k, 1.2), {
      tip: StageAnim.PAINT,
      u: C.os[1] === 'x' ? 'z' : 'x',
      t: 0,
    });
  }
  /** Room floor rectangles: [x0, z0, x1, z1]. */
  const rooms: Record<string, [number, number, number, number]> = {
    banya: [0, 0, 2.54, 2.54],
    antre: [0, 2.66, 2.54, APT_D],
    spalnya: [2.66, 0, 5.94, 4.14],
    dnevna: [6.06, 0, APT_W, APT_D],
    nisha: [2.66, 4.26, 6.06, APT_D],
  };
  for (const [C, [L, O, k, et]] of Object.entries(rooms)) {
    add('>izk', C === 'banya' ? 'plS' : 'parS', plane('+y', 0.012, L, k, O, et, C === 'banya' ? 1.2 : 1.6), {
      tip: StageAnim.WIPE,
      u: 'x',
    });
    add('zam>', 'zamazka', plane('+y', 0.03, L, k, O, et, 2), {
      tip: StageAnim.PAINT,
      u: 'x',
    });
    add(
      C === 'banya' ? 'ban>' : 'nas>',
      C === 'banya' || C === 'antre' ? 'plN' : 'parN',
      plane('+y', 0.042, L, k, O, et, C === 'banya' || C === 'antre' ? 1.2 : 1.05),
      {
        tip: StageAnim.PAINT,
        u: 'z',
      },
    );
  }
  for (const [C, L, O, k] of [
    [1, 2.54, 1.8, 2.66],
    [partitionX0, 3.05, partitionX1, 3.85],
    [partitionX0, 4.7, partitionX1, 5.7],
  ] as const) {
    add('nas>', 'darvo', box(C, 0.03, L, O, 0.05, k, 0.5), {
      tip: StageAnim.SCALE,
      t: 0.9,
    });
    add('>izk', 'parS', box(C, 0, L, O, 0.014, k, 0.5), {
      tip: StageAnim.SCALE,
    });
  }
  /** Window frame (+ glass) in the front wall; old frames are removed, new ones slide in. */
  function windowFrame(
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    stage: string,
    recipe: string,
    bar = 0.06,
    panes = 2,
  ) {
    const zIn = -WALL_T + 0.06;
    const zOut = -0.06;
    const delay = stage.startsWith('>') ? 0 : 0.2;
    const anim: PartOptions = {
      tip: stage.startsWith('>') ? StageAnim.SCALE : StageAnim.SLIDE,
      t: delay,
      piv: [(x0 + x1) / 2, (y0 + y1) / 2, -WALL_T / 2],
    };
    add(stage, recipe, box(x0, y0, zIn, x1, y0 + bar, zOut, 0.5), anim);
    add(stage, recipe, box(x0, y1 - bar, zIn, x1, y1, zOut, 0.5), anim);
    add(stage, recipe, box(x0, y0, zIn, x0 + bar, y1, zOut, 0.5), anim);
    add(stage, recipe, box(x1 - bar, y0, zIn, x1, y1, zOut, 0.5), anim);
    for (let Vt = 1; Vt < panes; Vt++) {
      const At = x0 + ((x1 - x0) * Vt) / panes;
      add(stage, recipe, box(At - bar / 2, y0, zIn, At + bar / 2, y1, zOut, 0.5), anim);
    }
    if (stage.startsWith('>') && y1 - y0 < 2) {
      add(stage, recipe, box(x0, (y0 + y1) / 2 + 0.2, zIn, x1, (y0 + y1) / 2 + 0.2 + bar, zOut, 0.5), anim);
    }
    add(
      stage,
      'staklo',
      box(x0 + bar, y0 + bar, (zIn + zOut) / 2 - 0.004, x1 - bar, y1 - bar, (zIn + zOut) / 2 + 0.004),
      anim,
    );
  }
  windowFrame(windowA[0], windowA[1], windowA[2], windowA[3], '>dog', 'staroDarvo', 0.07, 2);
  windowFrame(windowB[0], windowB[1], windowB[2], windowB[3], '>dog', 'staroDarvo', 0.07, 1);
  windowFrame(windowA[0], windowA[1], windowA[2], windowA[3], 'dog>', 'pvc', 0.055, 2);
  windowFrame(windowB[0], windowB[1], windowB[2], windowB[3], 'dog>', 'pvc', 0.055, 1);
  add('dog>', 'byalo', box(windowA[0] - 0.04, windowA[2] - 0.03, -0.02, windowA[1] + 0.04, windowA[2], 0.2), {
    tip: StageAnim.SLIDE,
    t: 0.7,
  });
  points.prozorets = [4.4, 1.7, 0.1];
  /** Pipe / cable drawn along a path. */
  const pipe = (stage: string, recipe: string, points: readonly Vec3[], radius: number, delay: number) =>
    add(stage, recipe, tube(points, radius), {
      tip: StageAnim.PATH,
      u: 'uvx',
      t: delay,
    });
  pipe(
    'ins>',
    'kanal',
    [
      [0.12, 0, 2.42],
      [0.12, APT_H, 2.42],
    ],
    0.055,
    0,
  );
  pipe(
    'ins>',
    'sinya',
    [
      [0.03, 0.32, 2.3],
      [0.03, 0.32, 0.5],
      [0.4, 0.32, 0.03],
      [2.2, 0.32, 0.03],
      [2.2, 0.85, 0.03],
    ],
    0.014,
    0.15,
  );
  pipe(
    'ins>',
    'chervena',
    [
      [0.03, 0.26, 2.3],
      [0.03, 0.26, 0.6],
      [0.5, 0.26, 0.03],
      [2.1, 0.26, 0.03],
      [2.1, 0.85, 0.03],
    ],
    0.014,
    0.2,
  );
  pipe(
    'ins>',
    'sinya',
    [
      [0.03, 0.32, 1],
      [0.03, 1.1, 1],
    ],
    0.014,
    0.35,
  );
  pipe(
    'ins>',
    'kanal',
    [
      [0.12, 0.02, 2.3],
      [0.5, 0.02, 1.8],
      [0.5, 0.02, 0.6],
    ],
    0.03,
    0.3,
  );
  pipe(
    'ins>',
    'sinya',
    [
      [6.1, 0.45, 0.03],
      [7.3, 0.45, 0.03],
      [7.3, 0.6, 0.03],
    ],
    0.014,
    0.4,
  );
  pipe(
    'ins>',
    'chervena',
    [
      [6.1, 0.38, 0.03],
      [7.45, 0.38, 0.03],
      [7.45, 0.6, 0.03],
    ],
    0.014,
    0.45,
  );
  pipe(
    'ins>',
    'kanal',
    [
      [6.1, 0.02, 0.2],
      [7.4, 0.02, 0.2],
    ],
    0.025,
    0.4,
  );
  add('ins>', 'tamnoSivo', box(0, 1.35, 3.1, 0.06, 1.85, 3.55, 0.5), {
    tip: StageAnim.SCALE,
    t: 0,
  });
  points.tablo = [0.1, 1.6, 3.3];
  (
    [
      [
        [0.03, 1.6, 3.3],
        [0.03, 2.35, 3.3],
        [0.03, 2.35, 6.4],
      ],
      [
        [0.03, 2.35, 3.3],
        [0.03, 2.35, 2.75],
        [2.4, 2.35, 2.75],
        [2.4, 0.3, 2.75],
      ],
      [
        [2.7, 2.35, 3],
        [2.7, 2.35, 0.03],
        [5.9, 2.35, 0.03],
        [5.9, 0.3, 0.03],
      ],
      [
        [2.7, 2.35, 3],
        [2.7, 1.1, 3],
      ],
      [
        [6.1, 2.35, 4.1],
        [6.1, 2.35, 0.03],
        [9.8, 2.35, 0.03],
      ],
      [
        [6.1, 2.35, 3.2],
        [6.1, 1.2, 3.2],
      ],
      [
        [6.1, 2.35, 0.9],
        [6.1, 1.25, 0.9],
      ],
      [
        [5.9, 2.35, 2.2],
        [5.9, 0.5, 2.2],
      ],
      [
        [2.7, 2.35, 4.4],
        [2.7, 2.35, 6.4],
      ],
    ] as const
  ).forEach((C, L) => pipe('ins>', 'gofre', C, 0.011, 0.05 + L * 0.07));
  for (const [C, L, O, k] of [
    [2.4, 0.3, 2.72, 'z'],
    [5.9, 0.3, 0.06, 'z'],
    [2.72, 1.1, 3, 'x'],
    [6.12, 1.2, 3.2, 'x'],
    [6.12, 1.25, 0.9, 'x'],
    [5.88, 0.5, 2.2, 'x'],
    [0.06, 1.1, 4, 'x'],
  ] as const) {
    const et =
      k === 'x'
        ? box(C - 0.02, L - 0.04, O - 0.04, C + 0.02, L + 0.04, O + 0.04)
        : box(C - 0.04, L - 0.04, O - 0.02, C + 0.04, L + 0.04, O + 0.02);
    add('ins>', 'kutiyaEl', et, {
      tip: StageAnim.SCALE,
      t: 0.6 + Math.random() * 0.3,
    });
  }
  for (let C = 0; C <= 4; C++) {
    const L = 2.55 + C * 0.4;
    add('zam>', 'profil', box(6.08, 0.03, L, 6.12, APT_H - 0.05, L + 0.05, 0.5), {
      tip: StageAnim.GROW,
      t: C * 0.08,
    });
  }
  add('zam>', 'profil', box(6.08, 0.03, 2.55, 6.14, 0.08, 4.1), {
    tip: StageAnim.SLIDE,
    t: 0.1,
  });
  add('zam>', 'profil', box(6.08, APT_H - 0.08, 2.55, 6.14, APT_H - 0.03, 4.1), {
    tip: StageAnim.SLIDE,
    t: 0.15,
  });
  for (let C = 0; C < 3; C++) {
    add('zam>', 'gips', box(6.14, 0.03 + C * 0.85, 2.55, 6.165, 0.03 + (C + 1) * 0.85, 4.1, 1), {
      tip: StageAnim.SLIDE,
      t: 0.45 + C * 0.12,
    });
  }
  add('boy>', 'boyaAkt', box(6.166, 0.03, 2.55, 6.17, APT_H - 0.03, 4.1, 1.2), {
    tip: StageAnim.PAINT,
    u: 'z',
  });
  points.gips = [6.2, 1.8, 3.3];
  for (let C = 0; C < 3; C++) {
    add('>izk', 'stariMebeli', box(6.1 + C * 0.62, 0.02, 0, 6.1 + (C + 1) * 0.62 - 0.02, 0.86, 0.58, 0.6), {
      tip: StageAnim.SCALE,
      t: C * 0.1,
    });
  }
  add('>izk', 'staroDarvo', box(6.08, 0.86, -0, 7.98, 0.9, 0.62, 0.8), {
    tip: StageAnim.SCALE,
    t: 0.1,
  });
  add('>izk', 'byalo', roundedBox(8.05, 0.02, 0.02, 8.65, 1.65, 0.62, 0.08), {
    tip: StageAnim.SCALE,
    t: 0.2,
  });
  for (let C = 0; C < 2; C++) {
    add('>izk', 'stariMebeli', box(6.1 + C * 0.95, 1.5, 0, 6.1 + (C + 1) * 0.95 - 0.02, 2.1, 0.33, 0.6), {
      tip: StageAnim.SCALE,
      t: 0.05,
    });
  }
  const kitchenX0 = 6.7;
  const kitchenX1 = 8.35;
  add('dar>', 'kuhnya', box(6.07, 0.05, 0, 6.7, 2.25, 0.62, 0.6), {
    tip: StageAnim.GROW,
    t: 0,
  });
  for (let C = kitchenX0; C < kitchenX1 - 0.01; C += 0.55) {
    add('dar>', 'kuhnya', box(C + 0.005, 0.12, 0, Math.min(kitchenX1, C + 0.55) - 0.005, 0.86, 0.6, 0.6), {
      tip: StageAnim.GROW,
      t: 0.1 + (C - kitchenX0) * 0.12,
    });
  }
  add('dar>', 'cherno', box(kitchenX0, 0.05, 0, kitchenX1, 0.12, 0.56), {
    tip: StageAnim.GROW,
    t: 0.1,
  });
  add('dar>', 'plot', box(kitchenX0 - 0.02, 0.86, 0, kitchenX1 + 0.02, 0.9, 0.64, 0.8), {
    tip: StageAnim.SLIDE,
    t: 0.45,
  });
  for (let C = kitchenX0; C < kitchenX1 - 0.01; C += 0.55) {
    add('dar>', 'kuhnya', box(C + 0.005, 1.5, 0, Math.min(kitchenX1, C + 0.55) - 0.005, 2.25, 0.34, 0.6), {
      tip: StageAnim.FALL,
      t: 0.55 + (C - kitchenX0) * 0.1,
    });
  }
  add('dar>', 'darvo', box(kitchenX1 + 0.02, 1.62, 0, 8.42, 1.65, 0.28, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.7,
  });
  add('dar>', 'cherno', box(7.5, 0.902, 0.1, 8.1, 0.906, 0.52), {
    tip: StageAnim.SCALE,
    t: 0.75,
  });
  add('dar>', 'hrom', box(6.95, 0.9, 0.12, 7.45, 0.91, 0.5), {
    tip: StageAnim.SCALE,
    t: 0.75,
  });
  add('dar>', 'hrom', cylinder(7.2, 0.9, 0.08, 0.015, 0.32, 10), {
    tip: StageAnim.GROW,
    t: 0.8,
  });
  add('dar>', 'cherno', box(7.5, 0.18, 0.598, 8.1, 0.78, 0.605), {
    tip: StageAnim.SCALE,
    t: 0.8,
  });
  add('nas>', 'plN', plane('+z', 0.012, kitchenX0, kitchenX1, 0.9, 1.5, 1.2), {
    tip: StageAnim.PAINT,
    u: 'x',
    t: 0.6,
  });
  points.kuhnya = [7.4, 1.2, 0.4];
  add('osv>', 'led', box(kitchenX0, 1.49, 0.05, kitchenX1, 1.5, 0.3), {
    tip: StageAnim.SLIDE,
    t: 0.1,
  });
  add('>izk', 'keramika', roundedBox(0.02, 0.02, 0.02, 1.7, 0.58, 0.74, 0.06), {
    tip: StageAnim.SCALE,
    t: 0.1,
  });
  add('>izk', 'keramika', cylinder(2.1, 0, 0.3, 0.09, 0.7, 14), {
    tip: StageAnim.SCALE,
    t: 0.2,
  });
  add('>izk', 'keramika', roundedBox(1.85, 0.7, 0.04, 2.35, 0.86, 0.48, 0.05), {
    tip: StageAnim.SCALE,
    t: 0.2,
  });
  add('>izk', 'keramika', roundedBox(0.05, 0.02, 1.6, 0.6, 0.42, 1.95, 0.08), {
    tip: StageAnim.SCALE,
    t: 0.3,
  });
  add('>izk', 'keramika', roundedBox(0.02, 0.4, 1.62, 0.22, 0.85, 1.93, 0.04), {
    tip: StageAnim.SCALE,
    t: 0.3,
  });
  add('ban>', 'staklo', box(0, 0.05, 1.12, 0.95, 2.05, 1.13), {
    tip: StageAnim.GROW,
    t: 0.2,
  });
  add('ban>', 'cherno', box(0.95, 0.05, 1.11, 0.97, 2.05, 1.14), {
    tip: StageAnim.GROW,
    t: 0.2,
  });
  add('ban>', 'cherno', cylinder(0.45, 2.2, 0.5, 0.13, 0.015, 20), {
    tip: StageAnim.SCALE,
    t: 0.3,
  });
  add(
    'ban>',
    'cherno',
    tube(
      [
        [0.02, 2.25, 0.5],
        [0.45, 2.25, 0.5],
      ],
      0.012,
    ),
    {
      tip: StageAnim.SCALE,
      t: 0.3,
    },
  );
  add('ban>', 'cherno', box(0.2, 0.043, 0.95, 0.8, 0.05, 1), {
    tip: StageAnim.SCALE,
    t: 0.25,
  });
  add('ban>', 'keramika', roundedBox(0.02, 0.32, 1.65, 0.56, 0.72, 2.02, 0.12, 3), {
    tip: StageAnim.SCALE,
    t: 0.4,
  });
  add('ban>', 'cherno', box(0.015, 1, 1.75, 0.03, 1.15, 1.92), {
    tip: StageAnim.SCALE,
    t: 0.45,
  });
  add('ban>', 'darvo', box(1.35, 0.45, 0, 2.35, 0.88, 0.5, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.5,
  });
  add('ban>', 'keramika', roundedBox(1.6, 0.88, 0.08, 2.1, 1.02, 0.42, 0.04), {
    tip: StageAnim.FALL,
    t: 0.6,
  });
  add('ban>', 'cherno', cylinder(1.85, 1.02, 0.06, 0.013, 0.22, 10), {
    tip: StageAnim.GROW,
    t: 0.65,
  });
  add(
    'ban>',
    'hrom',
    new THREE.CylinderGeometry(0.36, 0.36, 0.01, 40).rotateX(Math.PI / 2).translate(1.85, 1.55, 0.02),
    {
      tip: StageAnim.SCALE,
      t: 0.7,
      piv: [1.85, 1.55, 0.03],
    },
  );
  add('osv>', 'led', new THREE.TorusGeometry(0.37, 0.012, 8, 48).translate(1.85, 1.55, 0.03), {
    tip: StageAnim.SCALE,
    t: 0.3,
    piv: [1.85, 1.55, 0.03],
  });
  points.banya = [1.3, 1.5, 1.3];
  add('>izk', 'darvoT', box(2.68, 0.02, 0.4, 3.3, 2, 2.3, 0.8), {
    tip: StageAnim.SCALE,
    t: 0.4,
  });
  add('>izk', 'staraSofa', roundedBox(3.6, 0.02, 1.6, 5.6, 0.48, 3.2, 0.1), {
    tip: StageAnim.SCALE,
    t: 0.5,
  });
  for (let C = 0; C < 4; C++) {
    add('dar>', 'byalo', box(2.67, 0.05, 0.3 + C * 0.6, 3.27, 2.4, 0.3 + (C + 1) * 0.6 - 0.008, 0.6), {
      tip: StageAnim.GROW,
      t: C * 0.1,
    });
  }
  add('dar>', 'darvo', box(2.67, 0.05, 2.7, 3.3, 2.42, 2.73, 0.6), {
    tip: StageAnim.GROW,
    t: 0.4,
  });
  add('dar>', 'darvo', box(2.67, 2.4, 0.3, 3.3, 2.43, 2.73, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.5,
  });
  add('obz>', 'legloTapitsiraNo', roundedBox(5.68, 0.04, 1.45, 5.92, 1.25, 3.35, 0.05), {
    tip: StageAnim.FALL,
    t: 0,
  });
  add('obz>', 'legloTapitsiraNo', roundedBox(3.85, 0.04, 1.6, 5.7, 0.36, 3.2, 0.05), {
    tip: StageAnim.FALL,
    t: 0.1,
  });
  add('obz>', 'chearshaf', roundedBox(3.85, 0.36, 1.62, 5.68, 0.56, 3.18, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0.2,
  });
  add('obz>', 'chearshaf', roundedBox(5.25, 0.56, 1.75, 5.62, 0.7, 2.35, 0.06, 3), {
    tip: StageAnim.FALL,
    t: 0.3,
  });
  add('obz>', 'chearshaf', roundedBox(5.25, 0.56, 2.45, 5.62, 0.7, 3.05, 0.06, 3), {
    tip: StageAnim.FALL,
    t: 0.32,
  });
  add('obz>', 'kilim2', roundedBox(3.85, 0.48, 1.58, 4.6, 0.6, 3.22, 0.04, 2), {
    tip: StageAnim.FALL,
    t: 0.35,
  });
  for (const C of [1.05, 3.45] as const) {
    add('dar>', 'darvo', box(5.42, 0.05, C - 0.22, 5.9, 0.5, C + 0.22, 0.5), {
      tip: StageAnim.GROW,
      t: 0.6,
    });
    add('osv>', 'svetlina', cylinder(5.66, 0.5, C, 0.09, 0.22, 16, 0.06), {
      tip: StageAnim.SCALE,
      t: 0.5,
    });
  }
  add('obz>', 'kilim', plane('+y', 0.048, 3.4, 5.5, 1, 3.7, 1.2), {
    tip: StageAnim.SCALE,
    t: 0,
    piv: [4.45, 0.05, 2.35],
  });
  points.spalnya = [4.6, 0.9, 2.4];
  add('>izk', 'staraSofa', roundedBox(8.9, 0.02, 2.6, 9.85, 0.85, 4.8, 0.12), {
    tip: StageAnim.SCALE,
    t: 0.6,
  });
  add('>izk', 'darvoT', box(7, 0.02, 3.2, 7.8, 0.5, 3.9, 0.6), {
    tip: StageAnim.SCALE,
    t: 0.65,
  });
  add('obz>', 'sofa', roundedBox(8.75, 0.05, 2.5, 9.7, 0.45, 4.9, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0,
  });
  add('obz>', 'sofa', roundedBox(9.45, 0.45, 2.5, 9.72, 0.92, 4.9, 0.1, 3), {
    tip: StageAnim.FALL,
    t: 0.08,
  });
  add('obz>', 'sofa', roundedBox(8.75, 0.45, 2.5, 9.72, 0.7, 2.72, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0.1,
  });
  add('obz>', 'sofa', roundedBox(8.75, 0.45, 4.68, 9.72, 0.7, 4.9, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0.1,
  });
  add('obz>', 'sofa', roundedBox(8.8, 0.45, 2.75, 9.44, 0.6, 3.68, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0.15,
  });
  add('obz>', 'sofa', roundedBox(8.8, 0.45, 3.72, 9.44, 0.6, 4.65, 0.08, 3), {
    tip: StageAnim.FALL,
    t: 0.17,
  });
  add('obz>', 'gorchitsa', roundedBox(9.25, 0.6, 2.9, 9.42, 0.98, 3.35, 0.06, 3), {
    tip: StageAnim.FALL,
    t: 0.3,
  });
  add('obz>', 'gorchitsa', roundedBox(9.25, 0.6, 4.1, 9.42, 0.98, 4.55, 0.06, 3), {
    tip: StageAnim.FALL,
    t: 0.32,
  });
  add('obz>', 'kilim', plane('+y', 0.048, 6.9, 9.3, 2.7, 4.8, 1.2), {
    tip: StageAnim.SCALE,
    t: 0,
    piv: [8.1, 0.05, 3.75],
  });
  add('obz>', 'darvo', cylinder(7.75, 0.38, 3.75, 0.45, 0.04, 40), {
    tip: StageAnim.FALL,
    t: 0.35,
  });
  add('obz>', 'chernoMat', cylinder(7.75, 0.05, 3.75, 0.05, 0.33, 12), {
    tip: StageAnim.FALL,
    t: 0.35,
  });
  add('obz>', 'tv', box(6.18, 1, 2.85, 6.22, 1.72, 4.05), {
    tip: StageAnim.SCALE,
    t: 0.4,
  });
  add('dar>', 'darvo', box(6.18, 0.18, 2.6, 6.6, 0.55, 4.25, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.8,
  });
  add('obz>', 'darvo', cylinder(4.1, 0.73, 5.45, 0.55, 0.04, 40), {
    tip: StageAnim.FALL,
    t: 0.45,
  });
  add('obz>', 'chernoMat', cylinder(4.1, 0.05, 5.45, 0.06, 0.68, 12), {
    tip: StageAnim.FALL,
    t: 0.45,
  });
  for (const [C, L, O] of [
    [-0.75, 0, 0],
    [0.75, 0, 0],
    [0, -0.75, 1],
    [0, 0.75, 1],
  ] as const) {
    const k = 4.1 + C;
    const et = 5.45 + L;
    add('obz>', 'tamnoSivo', roundedBox(k - 0.22, 0.42, et - 0.22, k + 0.22, 0.48, et + 0.22, 0.04), {
      tip: StageAnim.FALL,
      t: 0.55 + (C + L + 1) * 0.05,
    });
    const Yt = O
      ? box(k - 0.22, 0.48, et + (L > 0 ? 0.18 : -0.22), k + 0.22, 0.86, et + (L > 0 ? 0.22 : -0.18))
      : box(k + (C > 0 ? 0.18 : -0.22), 0.48, et - 0.22, k + (C > 0 ? 0.22 : -0.18), 0.86, et + 0.22);
    add('obz>', 'tamnoSivo', Yt, {
      tip: StageAnim.FALL,
      t: 0.58 + (C + L + 1) * 0.05,
    });
    for (const [Xt, Y] of [
      [-0.18, -0.18],
      [0.18, -0.18],
      [-0.18, 0.18],
      [0.18, 0.18],
    ] as const) {
      add('obz>', 'chernoMat', cylinder(k + Xt, 0.05, et + Y, 0.015, 0.37, 6), {
        tip: StageAnim.FALL,
        t: 0.56,
      });
    }
  }
  for (let C = 0; C < 5; C++) {
    add('dar>', 'darvo', box(5, 0.3 + C * 0.45, 4.27, 5.92, 0.33 + C * 0.45, 4.6, 0.6), {
      tip: StageAnim.SLIDE,
      t: 0.3 + C * 0.06,
    });
  }
  add('dar>', 'darvo', box(4.98, 0.05, 4.27, 5.02, 2.2, 4.6, 0.6), {
    tip: StageAnim.GROW,
    t: 0.3,
  });
  add('dar>', 'darvo', box(5.9, 0.05, 4.27, 5.94, 2.2, 4.6, 0.6), {
    tip: StageAnim.GROW,
    t: 0.3,
  });
  add(
    'osv>',
    'chernoMat',
    tube(
      [
        [4.1, APT_H, 5.45],
        [4.1, 1.55, 5.45],
      ],
      0.005,
    ),
    {
      tip: StageAnim.PATH,
      u: 'uvx',
      t: 0.4,
    },
  );
  add('osv>', 'lampaShir', new THREE.ConeGeometry(0.28, 0.24, 28, 1, true).translate(4.1, 1.45, 5.45), {
    tip: StageAnim.FALL,
    t: 0.5,
    piv: [4.1, 1.45, 5.45],
  });
  add('osv>', 'svetlina', new THREE.SphereGeometry(0.07, 14, 10).translate(4.1, 1.36, 5.45), {
    tip: StageAnim.SCALE,
    t: 0.55,
  });
  add('osv>', 'chernoMat', cylinder(9.85, 0.05, 5.6, 0.012, 1.55, 6), {
    tip: StageAnim.GROW,
    t: 0.6,
  });
  add('osv>', 'svetlina', cylinder(9.85, 1.5, 5.6, 0.2, 0.3, 20, 0.14), {
    tip: StageAnim.SCALE,
    t: 0.7,
  });
  points.osvetlenie = [4.1, 1.5, 5.45];
  points.dnevna = [8.9, 0.9, 3.7];
  for (const [C, L, O] of [
    [9.7, 0.4, 1],
    [6.4, 5.95, 0.8],
    [3.2, 6.2, 0.7],
  ] as const) {
    add('obz>', 'savad', cylinder(C, 0.05, L, O * 0.16, O * 0.32, 16, O * 0.2), {
      tip: StageAnim.FALL,
      t: 0.7,
    });
    add(
      'obz>',
      'rastenie',
      new THREE.IcosahedronGeometry(O * 0.34, 1).scale(1, 1.25, 1).translate(C, O * 0.32 + O * 0.4, L),
      {
        tip: StageAnim.SCALE,
        t: 0.78,
        piv: [C, O * 0.35, L],
      },
    );
  }
  add('>izk', 'darvoT', box(0.02, 0.02, 4.2, 0.45, 1, 5.4, 0.6), {
    tip: StageAnim.SCALE,
    t: 0.7,
  });
  for (let C = 0; C < 3; C++) {
    add('dar>', 'tamnoSivo', box(0.02, 0.05, 3.7 + C * 0.6, 0.62, 2.4, 3.7 + (C + 1) * 0.6 - 0.008, 0.6), {
      tip: StageAnim.GROW,
      t: 0.2 + C * 0.1,
    });
  }
  add('dar>', 'darvo', box(0.02, 0.05, 5.5, 0.48, 0.48, 6.4, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.5,
  });
  add('dar>', 'tamnoSivo', roundedBox(0.04, 0.48, 5.52, 0.46, 0.58, 6.38, 0.04), {
    tip: StageAnim.FALL,
    t: 0.6,
  });
  add('dar>', 'chernoMat', box(0.9, 0.05, APT_D + 0.02, 1.9, SILL_H, APT_D + 0.08), {
    tip: StageAnim.GROW,
    t: 0.1,
  });
  add(
    'dar>',
    'byalo',
    box(partitionX0 + 0.02, 0.05, 3.06, partitionX0 + 0.06, 2.03, 3.84, 0.5)
      .rotateY(0)
      .translate(0, 0, 0),
    {
      tip: StageAnim.GROW,
      t: 0.15,
    },
  );
  add('dar>', 'byalo', box(1, 0.05, 2.56, 1.78, 2.03, 2.6, 0.5), {
    tip: StageAnim.GROW,
    t: 0.15,
  });
  points.antre = [0.5, 1.4, 4.3];
  /** Deterministic pseudo-random 0..1 (debris and dust placement). */
  const hash = (n: number) => {
    const v = Math.sin(n * 127.1) * 43758.5453;
    return v - Math.floor(v);
  };
  for (const [C, L] of [
    [1.3, 1.3],
    [4.4, 1.9],
    [8.2, 3.6],
    [4.3, 5.4],
    [1.3, 4.6],
    [7.2, 1.3],
  ] as const) {
    for (let O = 0; O < 9; O++) {
      const k = 0.12 + hash(C * 7 + O) * 0.16;
      const et = C + (hash(L + O) - 0.5) * 0.7;
      const j = L + (hash(C + L + O * 3) - 0.5) * 0.7;
      add(
        'izk~',
        O % 3 ? 'otpadak' : 'tuhla',
        new THREE.DodecahedronGeometry(k, 0).translate(et, k * 0.6, j),
        {
          tip: StageAnim.SCALE,
          t: hash(O + C) * 0.6,
          piv: [et, 0, j],
        },
      );
    }
    add('izk~', 'torba', roundedBox(C + 0.4, 0, L - 0.6, C + 0.95, 0.75, L - 0.05, 0.12, 3), {
      tip: StageAnim.FALL,
      t: 0.5,
    });
  }
  for (const [C, L, O] of [
    [5.2, 3.3, 'kofa'],
    [5.45, 3.4, 'kofaSinya'],
    [7.9, 5.3, 'kofa'],
    [1.6, 5.6, 'kofaSinya'],
  ] as const) {
    add('ins>poc', O, cylinder(C, 0.04, L, 0.13, 0.3, 18, 0.15), {
      tip: StageAnim.FALL,
      t: 0.4,
    });
  }
  add('ins>poc', 'profil', box(7.6, 0.04, 5.6, 9.4, 0.12, 5.9, 0.6), {
    tip: StageAnim.SLIDE,
    t: 0.2,
  });
  {
    for (let L = 0; L < 260; L++) {
      const O = 0.2 + hash(L * 1.31) * (APT_W - 0.4);
      const k = 0.2 + hash(L * 2.17) * (APT_D - 0.4);
      const et = 0.15 + hash(L * 3.7) * 1.9;
      const j = 0.008 + hash(L * 5.1) * 0.014;
      const Ct = new THREE.OctahedronGeometry(j, 0).translate(O, et, k);
      add('izk>poc', 'prah', Ct, {
        tip: StageAnim.SCALE,
        t: hash(L * 9.3),
        piv: [O, et, k],
      });
    }
  }
  const group = new THREE.Group();
  const meshesByStage = batcher.build(group);

  // Each stage key gets its own material instances, rendering on the right side of the hero
  // "renovation front": shell = both sides, old parts (">x") = old side, new parts ("x>") = new
  // side, transient parts ("x~", "a>b") = only the band around the front.
  const materialsByStage = new Map<string, StageMaterial[]>();
  for (const [stage, meshes] of meshesByStage) {
    const side: FrontSide = stage === 'obv' ? 2 : stage.startsWith('>') ? 0 : stage.endsWith('>') ? 1 : 3;
    const list: StageMaterial[] = [];
    for (const mesh of meshes) {
      const recipe = (mesh.material as StageMaterial).userData.recepta ?? '';
      const m = createStageMaterial({ ...recipes[recipe] }, { side });
      m.userData.recepta = recipe;
      mesh.material = m;
      mesh.customDepthMaterial = m.userData.dm;
      list.push(m);
    }
    materialsByStage.set(stage, list);
  }
  // the shared batching materials are no longer used
  for (const m of materialCache.values()) {
    m.dispose();
    m.userData.dm.dispose();
  }

  /** Progress 0..1 of every stage. */
  const progress = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<Stage, number>;
  const stageProgress = (key: string | undefined, fallback: number) =>
    key && key in progress ? progress[key as Stage] : fallback;
  const isLight = (m: StageMaterial) => m.userData.recepta === 'svetlina' || m.userData.recepta === 'led';

  /** Pushes the stage progress into every material's uA (build) / uB (remove) uniforms. */
  function applyProgress() {
    for (const [stage, materials] of materialsByStage) {
      let build = 1;
      let remove = 0;
      if (stage.endsWith('~')) {
        // debris: appears early in its stage and is cleared later in the same stage
        const p = stageProgress(stage.slice(0, -1), 0);
        build = clamp(p * 1.8);
        remove = clamp((p - 0.55) * 2.3);
      } else if (stage !== 'obv') {
        const [from, to] = stage.split('>');
        build = from ? stageProgress(from, 1) : 1;
        remove = to ? stageProgress(to, 0) : 0;
      }
      for (const m of materials) {
        m.userData.u.uA.value = build;
        m.userData.u.uB.value = remove;
      }
    }
    const lights = clamp((progress.osv - 0.55) * 3) * 2.2;
    for (const m of materialsByStage.get('osv>') ?? []) if (isLight(m)) m.emissiveIntensity = lights;
  }

  function setStage(stage: Stage, value: number) {
    progress[stage] = clamp(value);
    applyProgress();
  }

  /** Shows the finished apartment and the old one at once (the hero splits them by the front). */
  function showAll() {
    for (const materials of materialsByStage.values()) {
      for (const m of materials) {
        m.userData.u.uA.value = 1;
        m.userData.u.uB.value = 0;
      }
    }
    for (const m of materialsByStage.get('osv>') ?? []) if (isLight(m)) m.emissiveIntensity = 2.2;
  }

  function setAll(value: number) {
    for (const st of STAGES) progress[st] = value;
    applyProgress();
  }

  function forEachRecipe(recipe: string, fn: (m: StageMaterial) => void) {
    for (const materials of materialsByStage.values())
      for (const m of materials) if (m.userData.recepta === recipe) fn(m);
  }

  const allMaterials = () => [...materialsByStage.values()].flat();

  setAll(1);
  return {
    group,
    setStage,
    setAll,
    showAll,
    progress,
    points,
    forEachRecipe,
    allMaterials,
    textures: tex,
    size: { W: APT_W, D: APT_D, H: APT_H },
  };
}

export type Apartment = ReturnType<typeof buildApartment>;
