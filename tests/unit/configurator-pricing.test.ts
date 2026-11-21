/**
 * The configurator's indicative prices must match the original site exactly.
 * Golden data: tests/fixtures/pricing-original.json, captured from https://konkurs-zadacha.vercel.app/konstruktor/
 * (rows, total and per-m² line as rendered there) for 8 fixed configurations.
 */
import { describe, expect, it } from 'vitest';
import golden from '../fixtures/pricing-original.json';
import {
  price,
  euro,
  type ConfiguratorState,
  type HomeKind,
  type Building,
  type FloorKind,
  type MaterialClass,
} from '../../src/scripts/pages/configurator-pricing';

/** Same mapping as the page's URL state (v, p, s, o, f, w, k, c). */
function fromQuery(query: string): ConfiguratorState {
  const q = new URLSearchParams(query);
  const o = q.get('o') ?? '';
  return {
    vid: q.get('v') as HomeKind,
    plosht: Number(q.get('p')),
    stroeja: q.get('s') as Building,
    obhvat: o ? o.split('.') : [],
    pod: q.get('f') as FloorKind,
    steni: '#' + q.get('w'),
    kuhnya: '#' + q.get('k'),
    klas: q.get('c') as MaterialClass,
  };
}

describe('configurator pricing matches the original', () => {
  for (const g of golden) {
    it(g.query, () => {
      const p = price(fromQuery(g.query));
      const rows = p.lines.map((l) => [l.name, euro(l.min), euro(l.max)]);
      expect(rows).toEqual(g.rows.length === 1 && g.rows[0]?.length === 1 ? [] : g.rows);
      const total = p.min + p.max === 0 ? 'Изберете пера' : `${euro(p.min)} до ${euro(p.max)}`;
      expect(total).toBe(g.total);
      const perM2 = p.min ? `≈ ${p.perM2[0]} до ${p.perM2[1]} € на м²` : '';
      expect(perM2).toBe(g.perM2);
    });
  }
});

describe('euro()', () => {
  it('groups thousands with a plain space and appends €', () => {
    expect(euro(17900)).toBe('17 900 €');
    expect(euro(1150)).toBe('1150 €');
  });
});
