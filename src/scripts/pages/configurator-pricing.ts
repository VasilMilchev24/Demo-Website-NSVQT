/**
 * Indicative price of the configurator (/konstruktor/), ported 1:1 from the original konstruktor.js.
 * Market ranges per m² (EUR, labour + materials, no furniture), split into line items by share.
 */

export type HomeKind = 'ednostaen' | 'dvustaen' | 'tristaen' | 'kashta';
export type Building = 'staro' | 'novo';
export type MaterialClass = 'ikon' | 'sreden' | 'visok';
export type FloorKind = 'ribena' | 'laminat' | 'granit';

export interface ConfiguratorState {
  vid: HomeKind;
  plosht: number;
  stroeja: Building;
  obhvat: string[];
  pod: FloorKind;
  steni: string;
  kuhnya: string;
  klas: MaterialClass;
}

/** Total EUR per m² range for the whole renovation, by building age. */
const PER_M2: Record<Building, readonly [number, number]> = { staro: [250, 357], novo: [208, 346] };
/** Share of the total per line item ("vrati" — doors — is added to the carpentry line). */
const SHARE = {
  izkartvane: 0.05,
  instalatsii: 0.17,
  dograma: 0.11,
  zamazki: 0.12,
  steni: 0.17,
  nastilki: 0.13,
  banya: 0.17,
  osvetlenie: 0.03,
  vrati: 0.05,
} as const;
const CLASS_FACTOR: Record<MaterialClass, number> = { ikon: 0.85, sreden: 1, visok: 1.3 };
const FLOOR_FACTOR: Record<FloorKind, number> = { ribena: 1.25, laminat: 0.75, granit: 1.1 };
/** Kitchen price per linear metre, and kitchen length by home kind. */
const KITCHEN_PER_M: readonly [number, number] = [350, 1100];
const KITCHEN_LENGTH: Record<HomeKind, number> = { ednostaen: 2.4, dvustaen: 3, tristaen: 3.6, kashta: 4.2 };
const CLEANING_PER_M2: readonly [number, number] = [1.5, 3.5];

export const ITEM_NAMES: Record<string, string> = {
  izkartvane: 'Изкъртване и извозване',
  instalatsii: 'Ел. и ВиК инсталации',
  dograma: 'Смяна на дограма',
  zamazki: 'Замазки и гипсокартон',
  steni: 'Шпакловка и боядисване',
  nastilki: 'Настилки',
  banya: 'Баня',
  darvodelski: 'Кухня по мярка',
  osvetlenie: 'Осветление и детайли',
  pochistvane: 'Финално почистване',
};

export interface PriceLine {
  key: string;
  name: string;
  min: number;
  max: number;
}
export interface Price {
  lines: PriceLine[];
  min: number;
  max: number;
  perM2: [number, number];
}

const SHARED_ITEMS = [
  'izkartvane',
  'instalatsii',
  'dograma',
  'zamazki',
  'steni',
  'nastilki',
  'banya',
  'osvetlenie',
] as const;

export function price(s: ConfiguratorState): Price {
  const area = s.plosht;
  const [lo, hi] = PER_M2[s.stroeja];
  const k = CLASS_FACTOR[s.klas];
  const lines: PriceLine[] = [];

  for (const key of SHARED_ITEMS) {
    if (!s.obhvat.includes(key)) continue;
    let share: number = SHARE[key];
    if (key === 'nastilki') share *= FLOOR_FACTOR[s.pod];
    // (The original also added `SHARE.vrati * 0` to the lighting share here: a no-op, left out.)
    lines.push({ key, name: ITEM_NAMES[key] ?? key, min: area * lo * share * k, max: area * hi * share * k });
  }
  if (s.obhvat.includes('darvodelski')) {
    const length = KITCHEN_LENGTH[s.vid];
    lines.push({
      key: 'darvodelski',
      name: `${ITEM_NAMES['darvodelski']} (≈ ${String(length).replace('.', ',')} л.м)`,
      min: length * KITCHEN_PER_M[0] + area * lo * SHARE.vrati * k,
      max: length * KITCHEN_PER_M[1] + area * hi * SHARE.vrati * k,
    });
  }
  if (s.obhvat.includes('pochistvane')) {
    lines.push({
      key: 'pochistvane',
      name: ITEM_NAMES['pochistvane'] ?? '',
      min: area * CLEANING_PER_M2[0],
      max: area * CLEANING_PER_M2[1],
    });
  }

  const round50 = (v: number) => Math.round(v / 50) * 50;
  for (const line of lines) {
    line.min = round50(line.min);
    line.max = round50(line.max);
  }
  const min = lines.reduce((sum, l) => sum + l.min, 0);
  const max = lines.reduce((sum, l) => sum + l.max, 0);
  return { lines, min, max, perM2: area ? [Math.round(min / area), Math.round(max / area)] : [0, 0] };
}

/** "12 345 €" (Bulgarian grouping, plain spaces). */
export const euro = (v: number): string =>
  Math.round(v)
    .toLocaleString('bg-BG')
    .replace(/\u00a0|\u202f/g, ' ') + ' €';
