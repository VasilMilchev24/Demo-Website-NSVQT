/**
 * Shared animation runtime: GSAP + ScrollTrigger driven by Lenis smooth scroll.
 * Imported by the core script and by page scripts (one instance per page, bundled once by Vite).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { prefersReducedMotion } from './dom';

gsap.registerPlugin(ScrollTrigger);

/** Lenis instance, or null when the user prefers reduced motion (native scrolling). */
export const lenis: Lenis | null = prefersReducedMotion
  ? null
  : new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: { offset: -100 },
    });

if (lenis) lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis?.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Current scroll position (Lenis-aware). */
export const getScroll = (): number => (lenis ? lenis.scroll : scrollY);

/** Smoothly scrolls to a position or element (100px header offset, as in the original). */
export function scrollToTarget(target: number | HTMLElement): void {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4 });
    return;
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY - 100;
  scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

/** Stops / resumes smooth scrolling (used while overlays are open). */
export const lockScroll = (locked: boolean): void => {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
};

export { gsap, ScrollTrigger };
