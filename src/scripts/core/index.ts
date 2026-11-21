/** Core behaviour loaded on every page (the equivalent of the original osnova.js). */
import { initReveal } from './reveal';
import { initCounters } from './counters';
import { initHeader } from './header';
import { initScrollEffects } from './scroll-effects';
import { initGallery } from './gallery';
import { initCopyLink } from './copy-link';

// Note: the `js` class is added synchronously by a tiny inline script in <head> (allowed by CSP hash)
// so reveal-on-scroll elements never flash before this module runs.

initReveal();
initCounters();
initHeader();
initScrollEffects();
initGallery();
initCopyLink();
