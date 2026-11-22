/**
 * Contact form (/kontakti/). As in the original this is a demo: valid input is turned into a summary
 * and a prefilled "mailto:" link (decision: keep the mailto demo behaviour, no backend).
 *
 * FIX T-10: errors set aria-invalid and are announced (aria-describedby on each field, a polite live
 * region for the summary), and the optional phone is checked with a lenient pattern.
 * Also supports "?konstruktor=<base64 UTF-8>" from the configurator: prefills the message.
 */
import { $, $$, prefersReducedMotion } from '../core/dom';
import { site } from '../../config/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits, spaces, "+", "-", "(", ")" and 6–20 characters: accepts 088 000 0000, +359 88 000 0000. */
const PHONE_RE = /^\+?[\d\s()-]{6,20}$/;

/** Decodes the configurator's Base64 (UTF-8) summary. */
function decodeSummary(value: string): string {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function initContactForm(): void {
  const form = $<HTMLFormElement>('[data-forma]');
  const done = $<HTMLElement>('[data-gotovo]');
  const summary = $<HTMLElement>('[data-rezyume]');
  const mailto = $<HTMLAnchorElement>('[data-mailto]');
  if (!form || !done || !summary || !mailto) return;

  const chips = $$<HTMLButtonElement>('[data-izbor] button');
  chips.forEach((chip) =>
    chip.addEventListener('click', () =>
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'),
    ),
  );

  const field = (id: string) => $<HTMLInputElement | HTMLTextAreaElement>(`#${id}`, form);
  const name = field('f-ime');
  const phone = field('f-tel');
  const email = field('f-email');
  const message = field('f-sab');
  const consent = $<HTMLInputElement>('input[name="saglasie"]', form);
  const consentError = $<HTMLElement>('.zab-saglasie', form);
  if (!name || !phone || !email || !message || !consent || !consentError) return;

  const fromConfigurator = new URLSearchParams(location.search).get('konstruktor');
  if (fromConfigurator) {
    try {
      message.value = `Здравейте! Интересува ме ремонт по конструктора на сайта:\n${decodeSummary(fromConfigurator)}\n\nМоля, свържете се с мен за оглед.`;
      chips.find((c) => c.textContent?.trim() === 'Апартамент')?.setAttribute('aria-pressed', 'true');
    } catch {
      // Malformed parameter: leave the form empty, as the original did.
    }
  }

  const setError = (input: HTMLInputElement | HTMLTextAreaElement, isError: boolean): void => {
    input.closest('.pole')?.classList.toggle('greshno', isError);
    input.setAttribute('aria-invalid', String(isError));
  };
  [name, phone, email, message].forEach((input) =>
    input.addEventListener('input', () => setError(input, false)),
  );
  consent.addEventListener('change', () => {
    consent.setAttribute('aria-invalid', String(!consent.checked));
    if (consent.checked) consentError.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameOk = name.value.trim() !== '';
    const emailOk = EMAIL_RE.test(email.value.trim());
    const messageOk = message.value.trim() !== '';
    const phoneOk = phone.value.trim() === '' || PHONE_RE.test(phone.value.trim());
    setError(name, !nameOk);
    setError(email, !emailOk);
    setError(message, !messageOk);
    setError(phone, !phoneOk);
    consentError.hidden = consent.checked;
    consent.setAttribute('aria-invalid', String(!consent.checked));

    if (!(nameOk && emailOk && messageOk && phoneOk && consent.checked)) {
      $<HTMLElement>('[aria-invalid="true"]', form)?.focus();
      return;
    }

    const kinds = chips
      .filter((c) => c.getAttribute('aria-pressed') === 'true')
      .map((c) => c.textContent?.trim() ?? '');
    const text = [
      `Име: ${name.value.trim()}`,
      `Имейл: ${email.value.trim()}`,
      phone.value.trim() ? `Телефон: ${phone.value.trim()}` : '',
      kinds.length ? `Ремонт: ${kinds.join(', ')}` : '',
      '',
      message.value.trim(),
    ]
      .filter((line, i) => line || i === 4)
      .join('\n');

    summary.textContent = text;
    const subject = `Запитване от сайта: ${kinds[0] ?? 'ремонт'}`;
    mailto.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    // Move focus to the result so keyboard and screen-reader users land on it.
    $<HTMLElement>('h3', done)?.focus();
  });
}

initContactForm();
