/** "Копирай връзката" buttons: copy the page URL and confirm briefly. */
import { $, $$ } from './dom';

export function initCopyLink(): void {
  $$('[data-kopirai]').forEach((button) =>
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
      } catch {
        // Clipboard can be unavailable (permissions / insecure context); the UI still confirms.
      }
      button.classList.add('kopirano');
      const label = $('span', button);
      const original = label?.textContent ?? '';
      if (label) label.textContent = 'Копирано';
      setTimeout(() => {
        button.classList.remove('kopirano');
        if (label) label.textContent = original;
      }, 1800);
    }),
  );
}
