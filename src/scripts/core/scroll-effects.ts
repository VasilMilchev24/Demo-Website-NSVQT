/**
 * Scroll-linked effects: compact header, paint-roller progress, marquee ribbons,
 * background-word parallax, stacking cards, step line, magnetic buttons.
 */
import { $, $$, canHover, prefersReducedMotion } from './dom';
import { gsap, ScrollTrigger, getScroll, scrollToTarget } from './motion';

function initHeaderAndRoller(): void {
  const header = $('#glava');
  const roller = $('.ryb');
  const rollerHead = roller ? $<SVGElement>('.valec', roller) : null;
  $('.ryb__valyak')?.addEventListener('click', () => scrollToTarget(0));
  let last = -1;
  gsap.ticker.add(() => {
    const y = getScroll();
    if (y === last) return;
    last = y;
    header?.classList.toggle('svita', y > 60);
    if (!roller) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    roller.style.setProperty('--p', p.toFixed(4));
    if (rollerHead) rollerHead.style.transform = `scaleX(${0.96 + 0.04 * Math.sin(y / 40)})`;
  });
}

/** Marquee ribbons drift continuously and speed up / reverse with scroll direction. */
function initMarquees(): void {
  if (prefersReducedMotion) return;
  $$('[data-lenta]').forEach((ribbon) => {
    const track = $('.lenta__vlak', ribbon);
    if (!track) return;
    let x = 0;
    let dir = -1;
    let boost = 0;
    let visible = false;
    let lastY = getScroll();
    new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    }).observe(ribbon);
    gsap.ticker.add((_time, delta) => {
      const y = getScroll();
      const dy = y - lastY;
      lastY = y;
      if (dy !== 0) {
        dir = dy > 0 ? -1 : 1;
        boost = Math.min(18, Math.abs(dy) * 0.5);
      }
      boost *= 0.92;
      if (!visible) return;
      const half = track.scrollWidth / 2;
      x += dir * (0.6 + boost) * (delta / 16.7);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  });
}

function initBackgroundWords(): void {
  if (prefersReducedMotion) return;
  $$('[data-fon-duma]').forEach((word, i) => {
    gsap.fromTo(
      word,
      { xPercent: i % 2 ? -18 : 6 },
      {
        xPercent: i % 2 ? 6 : -18,
        ease: 'none',
        scrollTrigger: { trigger: word.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

/** Stacked service cards: each card shrinks slightly as the next one slides over it. */
function initStackingCards(): void {
  const cards = $$('[data-kupchina]');
  if (!cards.length || prefersReducedMotion) return;
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.92,
      yPercent: -2,
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 96px', scrub: true },
    });
    gsap.to(card, {
      '--sen-k': 1,
      ease: 'none',
      scrollTrigger: { trigger: next, start: 'top 60%', end: 'top 96px', scrub: true },
    });
  });
}

function initStepLines(): void {
  $$('[data-stapki]').forEach((steps) => {
    const line = $('.stapki__linia', steps);
    if (!line) return;
    ScrollTrigger.create({
      trigger: steps,
      start: 'top 85%',
      end: 'bottom 60%',
      onUpdate: (self) => line.style.setProperty('--p', self.progress.toFixed(3)),
    });
  });
}

/** Buttons follow the cursor slightly (desktop only, not in the header). */
function initMagneticButtons(): void {
  if (!canHover || prefersReducedMotion) return;
  $$('.btn:not(.glava .btn)').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - r.left - r.width / 2) * 0.12,
        y: (e.clientY - r.top - r.height / 2) * 0.2,
        duration: 0.4,
        ease: 'power3.out',
      });
    });
    btn.addEventListener('mouseleave', () =>
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' }),
    );
  });
}

export function initScrollEffects(): void {
  initHeaderAndRoller();
  initMarquees();
  initBackgroundWords();
  initStackingCards();
  initStepLines();
  initMagneticButtons();
  addEventListener('load', () => ScrollTrigger.refresh());
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
