/**
 * The four 3D tools of the "Защо да изберете нас" slides: wrench (Основа), spirit level (Форма),
 * paint roller (Детайли) and house (Топлина). Geometry values are the original ones.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const NAVY = 0x24345c;
export const SKY = 0x4cacd8;

const bevel = (
  depth: number,
  size: number,
  segments: number,
  curveSegments: number,
): THREE.ExtrudeGeometryOptions => ({
  depth,
  bevelEnabled: true,
  bevelThickness: size,
  bevelSize: size,
  bevelSegments: segments,
  curveSegments,
});

/** Open-ended wrench: handle + ring + jaw. */
export function createWrench(material: THREE.Material): THREE.Group {
  const length = 2.1;
  const width = 0.34;

  const handleShape = new THREE.Shape();
  handleShape.moveTo(-width / 2, -length / 2);
  handleShape.lineTo(width / 2, -length / 2);
  handleShape.lineTo(width / 2, length / 2);
  handleShape.lineTo(-width / 2, length / 2);
  handleShape.closePath();
  const handle = new THREE.ExtrudeGeometry(handleShape, bevel(0.14, 0.05, 4, 12));
  handle.translate(0, 0, -0.07);

  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, 0.52, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, 0.24, 0, Math.PI * 2, true);
  ringShape.holes.push(ringHole);
  const ring = new THREE.ExtrudeGeometry(ringShape, bevel(0.14, 0.05, 4, 40));
  ring.translate(0, -length / 2 - 0.2, -0.07);

  const jawRadius = 0.56;
  const jawGap = 0.19;
  const jawAngle = Math.asin(jawGap / jawRadius);
  const jawShape = new THREE.Shape();
  jawShape.moveTo(-jawGap, 0.02);
  jawShape.lineTo(-jawGap, Math.cos(jawAngle) * jawRadius);
  jawShape.absarc(0, 0, jawRadius, Math.PI / 2 + jawAngle, Math.PI * 2.5 - jawAngle, false);
  jawShape.lineTo(jawGap, 0.02);
  jawShape.absarc(0, 0.02, jawGap, 0, Math.PI, true);
  jawShape.closePath();
  const jaw = new THREE.ExtrudeGeometry(jawShape, bevel(0.14, 0.05, 4, 40));
  jaw.rotateZ(0.26);
  jaw.translate(0, length / 2 + 0.3, -0.07);

  const group = new THREE.Group();
  for (const geo of [handle, ring, jaw]) group.add(new THREE.Mesh(geo, material));
  group.rotation.z = -0.7;
  return group;
}

/** Spirit level: body, glass vial with liquid and a moving bubble (userData.meh), end caps. */
export function createLevel(bodyMaterial: THREE.Material, endMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new RoundedBoxGeometry(3, 0.42, 0.3, 4, 0.08), bodyMaterial));
  group.add(
    new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 0.3, 0.32, 3, 0.06),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.05,
        transmission: 0,
        transparent: true,
        opacity: 0.35,
      }),
    ),
  );
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.5, 24).rotateZ(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0xc8e86a,
        emissive: 0x5a7a10,
        emissiveIntensity: 0.25,
        roughness: 0.2,
      }),
    ),
  );
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }),
  );
  bubble.position.y = 0.04;
  group.add(bubble);
  group.userData['meh'] = bubble;
  for (const x of [-1.1, 1.1]) {
    const end = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.44, 0.32, 3, 0.06), endMaterial);
    end.position.x = x;
    group.add(end);
  }
  return group;
}

/** Paint roller: roller (material 0 gets a bump map later), end discs, bent frame, handle. */
export function createRoller(
  rollerMaterial: THREE.MeshStandardMaterial,
  metalMaterial: THREE.Material,
  handleMaterial: THREE.Material,
): THREE.Group {
  const group = new THREE.Group();
  const roller = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 1.7, 48, 1).rotateZ(Math.PI / 2),
    rollerMaterial,
  );
  roller.position.y = 0.9;
  group.add(roller);
  for (const x of [-0.86, 0.86]) {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.43, 0.43, 0.04, 48).rotateZ(Math.PI / 2),
      metalMaterial,
    );
    disc.position.set(x, 0.9, 0);
    group.add(disc);
  }
  const frame = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.88, 0.9, 0),
    new THREE.Vector3(1.05, 0.9, 0),
    new THREE.Vector3(1.08, 0.5, 0),
    new THREE.Vector3(0.6, 0.2, 0),
    new THREE.Vector3(0.1, 0.05, 0),
    new THREE.Vector3(0.05, -0.2, 0),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(frame, 40, 0.04, 10), metalMaterial));
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.9, 6, 16), handleMaterial);
  handle.position.set(0.05, -0.75, 0);
  group.add(handle);
  group.position.y = -0.1;
  return group;
}

/** House with a 2×2 window (one pane in the accent colour). */
export function createHouse(
  bodyMaterial: THREE.Material,
  paneMaterial: THREE.Material,
  accentPaneMaterial: THREE.Material,
): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(-1, -1);
  shape.lineTo(1, -1);
  shape.lineTo(1, 0.35);
  shape.quadraticCurveTo(1, 0.5, 0.88, 0.6);
  shape.lineTo(0.12, 1.22);
  shape.quadraticCurveTo(0, 1.32, -0.12, 1.22);
  shape.lineTo(-0.88, 0.6);
  shape.quadraticCurveTo(-1, 0.5, -1, 0.35);
  shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, bevel(0.5, 0.08, 5, 16));
  body.translate(0, 0, -0.25);

  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, bodyMaterial));
  const pane = 0.3;
  const gap = 0.06;
  const panes: [number, number, THREE.Material][] = [
    [-1, 1, paneMaterial],
    [1, 1, paneMaterial],
    [-1, -1, paneMaterial],
    [1, -1, accentPaneMaterial],
  ];
  for (const [x, y, material] of panes) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(pane, pane, 0.1, 3, 0.04), material);
    mesh.position.set(x * (pane / 2 + gap / 2), y * (pane / 2 + gap / 2) - 0.08, 0.36);
    group.add(mesh);
  }
  return group;
}
