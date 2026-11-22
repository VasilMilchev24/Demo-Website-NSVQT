/** Interactive features and issue-specific regressions (IDs from temp/issues_look/issues_look.md). */
import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

test.describe('desktop only', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'desktop checks');

  test('G-01/G-13: header CTA stays inside the header at every desktop width, also with hover', async ({
    page,
  }) => {
    await page.goto('/');
    for (const width of [1024, 1100, 1180, 1279, 1280, 1366, 1420, 1440, 1600, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      const nav = page.locator('.glava__nav a').first();
      if (await nav.isVisible()) await nav.hover();
      const box = await page.evaluate(() => {
        const header = document.querySelector('.glava')?.getBoundingClientRect();
        const cta = [...document.querySelectorAll<HTMLElement>('.glava .btn')].find(
          (b) => b.offsetParent !== null,
        );
        const c = cta?.getBoundingClientRect();
        return { headerRight: header?.right ?? 0, ctaRight: c?.right ?? 0, vw: innerWidth };
      });
      expect(box.ctaRight, `CTA right edge at ${width}px`).toBeLessThanOrEqual(box.vw);
      expect(box.ctaRight, `CTA inside header at ${width}px`).toBeLessThanOrEqual(box.headerRight + 0.5);
    }
  });

  test('mega-menu opens and lists the four services', async ({ page }) => {
    await page.goto('/');
    await page.locator('[aria-controls="mega"]').first().click();
    await expect(page.locator('#mega')).toBeVisible();
    await expect(page.locator('#mega .mega__u')).toHaveCount(4);
  });
});

test.describe('mobile only', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1000, 'mobile checks');

  test('G-08: hero CTAs are visible on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.geroi .btn-red .btn').first()).toBeVisible();
  });

  test('mobile menu opens and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('[aria-controls="mob-menyu"]');
    await burger.click();
    await expect(page.locator('#mob-menyu')).toBeVisible();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
  });
});

test('T-01: every Viber link uses the valid E.164 number', async ({ page }) => {
  await page.goto('/kontakti/');
  const hrefs = await page
    .locator('a[href^="viber:"]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of hrefs) expect(h).toBe('viber://chat/?number=%2B359880000000');
});

test('T-06: "#" social links do not open a new tab; G-02: footer wordmark is the right brand', async ({
  page,
}) => {
  await page.goto('/');
  expect(await page.locator('a[href="#"][target="_blank"]').count()).toBe(0);
  const footer = (await page.locator('footer').textContent()) ?? '';
  expect(footer).not.toContain('КИС');
  expect(footer.replace(/\s+/g, ' ')).toContain('РЕМОНТ СТУДИО');
});

test('T-05: JSON-LD is valid and has no "#" sameAs', async ({ page }) => {
  await page.goto('/');
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(data['@type']).toBe('HomeAndConstructionBusiness');
  expect(data.sameAs).toBeUndefined();
  expect(data.url).toMatch(/^https?:\/\//);
});

test('T-02: sitemap, robots and favicon are served', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  expect((await request.get('/robots.txt')).status()).toBe(200);
  expect((await request.get('/favicon.ico')).status()).toBe(200);
});

test('gallery: filter and lightbox', async ({ page }) => {
  await page.goto('/galeriya/');
  await expect(page.locator('[data-galeriya] a')).toHaveCount(21);
  await page.locator('[data-filtar="dvustaen-apartament-briz-varna"]').click();
  await expect(page.locator('[data-galeriya] a:not([hidden])')).toHaveCount(8);
  await page.locator('[data-galeriya] a:not([hidden])').first().click();
  const dialog = page.locator('.uvel');
  await expect(dialog).toHaveClass(/otvoreno/);
  await expect(page.locator('.uvel__br')).toHaveText('1 / 8');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.uvel__br')).toHaveText('2 / 8');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveClass(/otvoreno/);
});

test('T-10: contact form validates accessibly and builds the mailto summary', async ({ page }) => {
  await page.goto('/kontakti/');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#f-ime')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#f-ime')).toBeFocused();
  await page.fill('#f-ime', 'Иван');
  await page.fill('#f-email', 'ivan@example.com');
  await page.fill('#f-sab', 'Ремонт на баня');
  await page.fill('#f-tel', 'abc');
  await page.check('input[name=saglasie]');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#f-tel')).toHaveAttribute('aria-invalid', 'true');
  await page.fill('#f-tel', '088 000 0000');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('[data-gotovo]')).toBeVisible();
  await expect(page.locator('[data-rezyume]')).toContainText('Телефон: 088 000 0000');
  await expect(page.locator('[data-mailto]')).toHaveAttribute(
    'href',
    /^mailto:kontakt@remont-studio\.test\?subject=/,
  );
});

test('G-07: the e-mail fits in its card', async ({ page }) => {
  await page.goto('/kontakti/');
  expect(await page.locator('.k-email').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
});

test('configurator: URL state, price rows and the contact prefill', async ({ page }) => {
  await page.goto(
    '/konstruktor/?v=ednostaen&p=45&s=novo&o=instalatsii.steni.nastilki&f=laminat&w=E9EDF2&k=E7E4DE&c=ikon',
  );
  await expect(page.locator('[data-pera] tr')).toHaveCount(3);
  await expect(page.locator('[data-sbor]')).toHaveText(/€ до .*€/, { timeout: 3000 });
  const href = await page.locator('[data-zapitvane]').getAttribute('href');
  expect(href).toMatch(/^\/kontakti\/\?konstruktor=.+#forma$/);
  await page.goto(href ?? '/kontakti/');
  await expect(page.locator('#f-sab')).toHaveValue(/Жилище: едностаен апартамент, 45 м², ново строителство/);
  await page.goto('/konstruktor/');
  await page.locator('[data-vsichki="0"]').click();
  await expect(page.locator('[data-pera]')).toHaveText('Изберете поне едно перо.');
});

test('internal links all resolve', async ({ page, request }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1000, 'once is enough');
  test.setTimeout(300_000);
  const seen = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const h of hrefs) seen.add(h.split('#')[0] ?? h);
  }
  const broken: string[] = [];
  for (const href of seen) {
    const r = await request.get(href);
    if (r.status() !== 200) broken.push(`${r.status()} ${href}`);
  }
  expect(broken).toEqual([]);
});
