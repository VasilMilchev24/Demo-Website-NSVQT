/** Stroke icon path data (24×24 viewBox, currentColor). Paths copied from the original markup. */
export const ICON_PATHS = {
  arrow: ['M5 12h14M13 6l6 6-6 6'],
  phone: [
    'M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 6.9 6.9l1.3-2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z',
  ],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 6 6 6-6 6'],
  viber: [
    'M12 3c5 0 8 2.6 8 7.7 0 5.2-3.2 7.4-8 7.4-.8 0-1.6-.1-2.4-.2L6 20.5v-3.5C4.6 15.7 4 13.6 4 10.7 4 5.6 7 3 12 3Z',
    'M9.3 8.2c.4-.5 1-.4 1.3.1l.6 1c.2.4.1.9-.3 1.2l-.3.2c.4 1 1.2 1.8 2.2 2.2l.2-.3c.3-.4.8-.5 1.2-.3l1 .6c.5.3.6.9.1 1.3-.7.7-1.7.9-2.6.5a7.6 7.6 0 0 1-3.9-3.9c-.4-.9-.2-1.9.5-2.6Z',
  ],
  /** "Оглед" commitment card */
  inspect: ['M16 15h5v4h-5M18 15v2M20 15v2'],
  shield: ['M12 3.5 19 6v5.6c0 4.4-3 7.6-7 8.9-4-1.3-7-4.5-7-8.9V6Z', 'm9 12 2.2 2.2L15.5 10'],
  sparkle: [
    'M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.6l-1.6-5.4L5 10.6 10.4 9Z',
    'M18.5 15.5l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6Z',
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;
