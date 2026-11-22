/**
 * Every page × desktop and mobile: HTTP status, no console errors, no failed requests, no horizontal
 * overflow (G-10), images with alt and dimensions, head metadata (T-07, T-11), and axe with no
 * serious/critical violations (G-09, T-08).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES, NOT_FOUND } from './routes';

/** WebGL pages render in software in headless CI and need more time. */
const SLOW = new Set<string>(['/', '/proces/', '/konstruktor/']);

/** Known accessibility violations awaiting a decision (none at the moment). */
const KNOWN: Record<string, string[]> = {};

const watch = (page: Page) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => failed.push(`failed ${r.url()}`));
  return { errors, failed };
};

/** Scrolls through the page so lazy images, reveals and 3D scenes load. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
}

for (const route of ROUTES) {
  test(`page ${route}`, async ({ page }) => {
    if (SLOW.has(route)) test.slow();
    const log = watch(page);
    const res = await page.goto(route, { waitUntil: 'networkidle' });
    expect(res?.status(), 'HTTP status').toBe(200);
    await scrollThrough(page);
    await page.waitForLoadState('networkidle');

    expect(log.errors, 'console errors').toEqual([]);
    expect(log.failed, 'failed requests').toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(0);

    const images = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>('img:not(.uvel img)')].map((i) => ({
        src: i.currentSrc || i.src,
        alt: i.getAttribute('alt'),
        sized: i.hasAttribute('width') && i.hasAttribute('height'),
        broken: i.complete && i.naturalWidth === 0,
      })),
    );
    expect(
      images.filter((i) => i.alt === null).map((i) => i.src),
      'images without alt',
    ).toEqual([]);
    expect(
      images.filter((i) => !i.sized).map((i) => i.src),
      'images without width/height',
    ).toEqual([]);
    expect(
      images.filter((i) => i.broken).map((i) => i.src),
      'broken images',
    ).toEqual([]);

    // Head: title template, absolute canonical and og:image, noindex (demo), one H1.
    const head = await page.evaluate(() => ({
      title: document.title,
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
      og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      robots: document.querySelector('meta[name=robots]')?.getAttribute('content') ?? '',
      description: document.querySelector('meta[name=description]')?.getAttribute('content') ?? '',
      h1: document.querySelectorAll('h1').length,
    }));
    expect(head.title).toMatch(route === '/' ? /^Ремонт Студио: / : / \| Ремонт Студио$/);
    expect(head.canonical).toMatch(
      new RegExp(`^https?://[^/]+${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    );
    expect(head.og).toMatch(/^https?:\/\//);
    expect(head.robots).toBe('noindex, nofollow');
    expect(head.description.length).toBeGreaterThan(10);
    expect(head.h1).toBe(1);
  });

  test(`axe ${route}`, async ({ page }) => {
    if (SLOW.has(route)) test.slow();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'networkidle' });
    await scrollThrough(page);
    await page.evaluate(() =>
      document.querySelectorAll('.vlez,.otkrii,.redove').forEach((e) => e.classList.add('vleze')),
    );
    await page.waitForTimeout(1200);
    const results =
      await // @axe-core/playwright types its Page from a nested playwright-core copy; same object at runtime.
      new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0])
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
    const known = KNOWN[route] ?? [];
    if (known.length) test.info().annotations.push({ type: 'known issue', description: known.join('; ') });
    expect(
      serious.filter((v) => !known.includes(v)),
      'serious/critical axe violations',
    ).toEqual([]);
  });
}

test('404 page', async ({ page }) => {
  const res = await page.goto(NOT_FOUND);
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Тази страница я няма');
  await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
});
