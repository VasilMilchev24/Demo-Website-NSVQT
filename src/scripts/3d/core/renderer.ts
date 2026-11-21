/**
 * Renderer / texture / visibility helpers shared by all 3D scenes.
 * Ported from the original site's bundled 3D code (de-minified, renamed, typed).
 */
import * as THREE from 'three';

/** [key, url, isColourTexture] — colour textures are sRGB, data textures (normal maps) linear. */
export type TextureSpec = [key: string, url: string, srgb?: boolean];

/** Loads repeating textures; `onDone` fires once every texture has loaded (or failed). */
export function loadTextures<K extends string>(
  renderer: THREE.WebGLRenderer,
  list: readonly (readonly [K, string, boolean?])[],
  onDone?: () => void,
): Record<K, THREE.Texture> {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = {} as Record<K, THREE.Texture>;
  let pending = list.length;
  const settle = () => {
    if (--pending === 0) onDone?.();
  };
  for (const [key, url, srgb] of list) {
    const tex = loader.load(
      url,
      (t) => {
        renderer.initTexture(t);
        settle();
      },
      undefined,
      settle,
    );
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    textures[key] = tex;
  }
  return textures;
}

/** Creates the WebGL renderer inside `container`, or returns null when WebGL is unavailable. */
export function createRenderer(
  container: HTMLElement,
  { alpha = true, maxPixelRatio = 1.75 }: { alpha?: boolean; maxPixelRatio?: number } = {},
): THREE.WebGLRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if (alpha) renderer.setClearColor(0, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);
  return renderer;
}

/** Element size in CSS pixels (never 0). */
export function measure(el: Element): { w: number; h: number } {
  const rect = el.getBoundingClientRect();
  return {
    w: Math.max(2, Math.round(rect.width || innerWidth)),
    h: Math.max(2, Math.round(rect.height || innerHeight * 0.6)),
  };
}

/** Calls `onChange(true|false)` as the element enters/leaves the viewport or the tab is hidden. */
export function watchVisibility(el: Element, onChange: (visible: boolean) => void): void {
  let inView = true;
  new IntersectionObserver(
    ([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      onChange(inView && !document.hidden);
    },
    { rootMargin: '120px' },
  ).observe(el);
  document.addEventListener('visibilitychange', () => onChange(inView && !document.hidden));
}
