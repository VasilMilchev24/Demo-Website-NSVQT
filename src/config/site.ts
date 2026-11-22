/**
 * Single source of truth for brand and contact data.
 * Every phone / tel: / viber: / mailto: link on the site is derived from here
 * (the original hard-coded a malformed Viber number on every page — issue T-01).
 */

/** Phone number in E.164 format (digits only after "+"). */
const PHONE_E164 = '+359880000000';

/** Formats +359880000000 as the local display form used by the original: "088 000 0000". */
function formatLocalPhone(e164: string): string {
  const national = '0' + e164.replace(/^\+359/, '');
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

export const site = {
  name: 'Ремонт Студио',
  legalName: '„РЕМОНТ СТУДИО“ ЕООД',
  legalNameSchema: 'РЕМОНТ СТУДИО ЕООД',
  eik: '000000000',
  slogan: 'Ремонти на жилища във Варна',
  city: 'Варна',
  postalCode: '9000',
  area: 'Варна и региона',
  email: 'kontakt@remont-studio.test',
  phone: {
    e164: PHONE_E164,
    display: formatLocalPhone(PHONE_E164),
    href: `tel:${PHONE_E164}`,
    viber: `viber://chat/?number=${encodeURIComponent(PHONE_E164)}`,
  },
  /**
   * Social profiles. The original has no real URLs ("#"); kept as-is by decision,
   * but rendered without target="_blank" so they don't open a duplicate tab (T-06).
   */
  social: {
    facebook: '#',
    instagram: '#',
  },
  demoBadge: {
    label: 'Демо - Изработено от Васил Милчев NS-3HPV',
    href: 'https://nov-svyat-sait.vercel.app',
  },
  /** Footer disclaimer shown on every page. */
  graphicsNote: 'Графиките са 3D модели, правени за сайта, и изображения, генерирани с изкуствен интелект.',
  /** Large decorative footer wordmark (the original showed a foreign brand, "КИС БИЛД" — G-02). */
  wordmark: 'РЕМОНТ СТУДИО',
  ogImage: '/assets/img/og.jpg',
  themeColor: '#24345C',
} as const;

export type Site = typeof site;
