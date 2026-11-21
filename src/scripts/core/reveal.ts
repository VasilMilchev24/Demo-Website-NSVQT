/** Reveal-on-scroll: adds `.vleze` to elements as they enter the viewport (CSS does the animation). */
import { $$ } from './dom';

const SELECTOR =
  '.vlez, .otkrii, .redove, .chislo, .vkl__g, .podval__ime, .cht-karta, .reshenie, .st-golyama__v, .str-glava__kadar, .list-oferta, .list-dogovor';

export function initReveal(): void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('vleze');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
  );
  $$(SELECTOR).forEach((node) => io.observe(node));

  // Safety net: reveal anything already on screen (e.g. after a jump to an anchor).
  const revealVisible = (): void =>
    $$(SELECTOR).forEach((node) => {
      const r = node.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) node.classList.add('vleze');
    });
  addEventListener('load', () => setTimeout(revealVisible, 600));
  setTimeout(revealVisible, 2500);

  // Staggered letters of the footer wordmark.
  $$('.podval__ime span').forEach((span, i) => {
    span.style.transitionDelay = `${i * 0.04}s`;
  });
}
