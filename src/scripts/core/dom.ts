/** Small DOM helpers shared by all page scripts. */

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] => [
  ...root.querySelectorAll<T>(sel),
];

export const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True on devices with a precise pointer that can hover (desktop mouse). */
export const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Creates an element with attributes and children — DOM-only, never innerHTML (XSS-safe). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

/** Creates an SVG icon from path data (used by script-built UI such as the lightbox). */
export function svgIcon(paths: string[], strokeWidth = '2'): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', strokeWidth);
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}
