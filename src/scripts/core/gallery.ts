/** Gallery filter buttons and the photo lightbox ("увеличение"). */
import { $, $$, el, svgIcon } from './dom';
import { gsap, ScrollTrigger, lockScroll } from './motion';

function initFilter(): void {
  const buttons = $$<HTMLButtonElement>('[data-filtar]');
  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      const key = button.dataset['filtar'];
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      $$<HTMLAnchorElement>('[data-galeriya] a').forEach((link, i) => {
        const show = key === 'vsichki' || link.dataset['obekt'] === key;
        if (show && link.hidden) {
          link.hidden = false;
          gsap.fromTo(
            link,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, delay: (i % 6) * 0.04, ease: 'power3.out' },
          );
        } else if (!show) {
          link.hidden = true;
        }
      });
      ScrollTrigger.refresh();
    }),
  );
}

function initLightbox(): void {
  const galleries = $$('[data-galeriya]');
  if (!galleries.length) return;

  const prev = el('button', { type: 'button', class: 'uvel__pr', 'aria-label': 'Предишната' }, [
    svgIcon(['M15 6l-6 6 6 6']),
  ]);
  const next = el('button', { type: 'button', class: 'uvel__sl', 'aria-label': 'Следващата' }, [
    svgIcon(['M9 6l6 6-6 6']),
  ]);
  const closeBtn = el('button', { type: 'button', class: 'uvel__zatv', 'aria-label': 'Затвори' }, [
    svgIcon(['M6 6l12 12M18 6 6 18']),
  ]);
  const img = el('img', { alt: '' });
  const counter = el('div', { class: 'uvel__br', 'aria-live': 'polite' });
  const dialog = el('div', { class: 'uvel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Снимката' }, [
    prev,
    img,
    next,
    closeBtn,
    counter,
  ]);
  dialog.inert = true;
  document.body.append(dialog);

  let items: HTMLAnchorElement[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number): void => {
    index = (i + items.length) % items.length;
    const item = items[index];
    if (!item) return;
    img.src = item.getAttribute('href') ?? '';
    img.alt = $<HTMLImageElement>('img', item)?.alt ?? '';
    counter.textContent = `${index + 1} / ${items.length}`;
  };
  const isOpen = (): boolean => dialog.classList.contains('otvoreno');
  const close = (): void => {
    dialog.classList.remove('otvoreno');
    dialog.inert = true;
    lockScroll(false);
    opener?.focus();
  };

  galleries.forEach((gallery) =>
    $$<HTMLAnchorElement>('a', gallery).forEach((link) =>
      link.addEventListener('click', (e) => {
        e.preventDefault();
        opener = link;
        items = $$<HTMLAnchorElement>('a', gallery).filter((a) => !a.hidden);
        show(items.indexOf(link));
        dialog.classList.add('otvoreno');
        dialog.inert = false;
        lockScroll(true);
        closeBtn.focus();
      }),
    ),
  );
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'Tab') {
      // Keep focus inside the dialog.
      const focusables = [prev, next, closeBtn];
      const current = focusables.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      const step = e.shiftKey ? -1 : 1;
      focusables[(current + step + focusables.length) % focusables.length]?.focus();
    }
  });
  let touchX: number | null = null;
  dialog.addEventListener(
    'touchstart',
    (e) => {
      touchX = e.touches[0]?.clientX ?? null;
    },
    { passive: true },
  );
  dialog.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0]?.clientX;
    if (touchX === null || endX === undefined) return;
    const dx = endX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
}

export function initGallery(): void {
  initFilter();
  initLightbox();
}
