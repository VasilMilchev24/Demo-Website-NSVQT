/**
 * Number counters: `data-broi` is the final value, optional `data-ot` the start value
 * (e.g. 90 → 0 € for the free inspection, 6 → 1 partner). The HTML already holds the
 * final value, so the content is correct without JavaScript.
 */
import { $$, prefersReducedMotion } from './dom';
import { gsap } from './motion';

export function initCounters(): void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const node = entry.target as HTMLElement;
        const to = Number(node.dataset['broi']);
        const from = Number(node.dataset['ot'] ?? 0);
        if (prefersReducedMotion) {
          node.textContent = String(to);
          continue;
        }
        const state = { v: from };
        gsap.to(state, {
          v: to,
          duration: 1.6,
          ease: 'power3.out',
          delay: 0.2,
          onUpdate: () => {
            node.textContent = String(Math.round(state.v));
          },
        });
        // Guarantee the exact final value even if the tween is interrupted.
        setTimeout(() => {
          node.textContent = String(to);
        }, 2400);
      }
    },
    { threshold: 0.4 },
  );

  $$('[data-broi]').forEach((node) => {
    if (!prefersReducedMotion) node.textContent = node.dataset['ot'] ?? '0';
    io.observe(node);
  });
}
