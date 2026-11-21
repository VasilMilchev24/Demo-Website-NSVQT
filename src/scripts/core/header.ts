/** Header: hover pill, services mega-menu, dropdowns, mobile menu, compact state on scroll. */
import { $, $$, canHover } from './dom';
import { lockScroll } from './motion';

function initHoverPill(): void {
  const nav = $('.glava__nav');
  const pill = $('.glava__hapche');
  if (!nav || !pill || !canHover) return;
  $$('.nav-v', nav).forEach((item) =>
    item.addEventListener('mouseenter', () => {
      const r = item.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      pill.style.width = `${r.width}px`;
      pill.style.transform = `translateX(${r.left - n.left}px)`;
      pill.style.opacity = '1';
    }),
  );
  nav.addEventListener('mouseleave', () => {
    pill.style.opacity = '0';
  });
}

function initMegaMenu(): void {
  const mega = $('#mega');
  const btn = $<HTMLButtonElement>('.mm-btn');
  if (!mega || !btn) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const open = (): void => {
    clearTimeout(timer);
    mega.classList.add('otvoreno');
    mega.inert = false;
    btn.setAttribute('aria-expanded', 'true');
  };
  const close = (): void => {
    clearTimeout(timer);
    mega.classList.remove('otvoreno');
    mega.inert = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  const closeSoon = (): void => {
    clearTimeout(timer);
    timer = setTimeout(close, 220);
  };
  mega.inert = true;
  // On desktop, hovering opens the menu; the original then let the click toggle it shut again
  // a moment later. A click right after a hover-open now keeps it open.
  let hoverOpenedAt = 0;
  btn.addEventListener('click', () => {
    const justHovered = performance.now() - hoverOpenedAt < 600;
    if (mega.classList.contains('otvoreno') && !justHovered) close();
    else open();
  });
  if (canHover) {
    btn.addEventListener('mouseenter', () => {
      if (!mega.classList.contains('otvoreno')) hoverOpenedAt = performance.now();
      open();
    });
    btn.addEventListener('mouseleave', closeSoon);
    mega.addEventListener('mouseenter', () => clearTimeout(timer));
    mega.addEventListener('mouseleave', closeSoon);
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mega.classList.contains('otvoreno')) {
      close();
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (!mega.contains(t) && !btn.contains(t)) close();
  });
  // Keyboard users: close when focus leaves both the button and the panel.
  mega.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Node | null;
    if (next && !mega.contains(next) && !btn.contains(next)) close();
  });
}

function initDropdowns(): void {
  $$('.glava__nav li').forEach((li) => {
    const menu = $('.padashto', li);
    const trigger = $('.nav-v', li);
    if (!menu || !trigger) return;
    // Touch devices: first tap opens the dropdown, second tap follows the link.
    trigger.addEventListener('click', (e) => {
      if (!canHover && !li.classList.contains('otvoreno')) {
        e.preventDefault();
        li.classList.add('otvoreno');
      }
    });
    document.addEventListener('click', (e) => {
      if (!li.contains(e.target as Node)) li.classList.remove('otvoreno');
    });
    li.addEventListener('focusin', () => li.classList.add('otvoreno'));
    li.addEventListener('focusout', (e) => {
      if (!li.contains(e.relatedTarget as Node | null)) li.classList.remove('otvoreno');
    });
  });
}

function initMobileMenu(): void {
  const btn = $<HTMLButtonElement>('.glava__menu');
  const menu = $('#mob-menyu');
  if (!btn || !menu) return;
  const set = (open: boolean): void => {
    document.body.classList.toggle('menyu-otvoreno', open);
    btn.setAttribute('aria-expanded', String(open));
    menu.inert = !open;
    lockScroll(open);
  };
  menu.inert = true;
  btn.addEventListener('click', () => set(!document.body.classList.contains('menyu-otvoreno')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menyu-otvoreno')) {
      set(false);
      btn.focus();
    }
  });
}

export function initHeader(): void {
  initHoverPill();
  initMegaMenu();
  initDropdowns();
  initMobileMenu();
}
