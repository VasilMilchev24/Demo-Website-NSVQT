/**
 * The CSP in vercel.json allows exactly one inline script by its SHA-256 hash. If the script in
 * src/config/inline-scripts.ts changes, this test fails until the hash in vercel.json is updated.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JS_CLASS_SCRIPT } from '../../src/config/inline-scripts';

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}
const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as VercelConfig;
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy')?.value ?? '';

describe('Content-Security-Policy', () => {
  it('whitelists the hash of the inline js-class script', () => {
    const hash = `'sha256-${createHash('sha256').update(JS_CLASS_SCRIPT).digest('base64')}'`;
    expect(csp).toContain(`script-src 'self' ${hash}`);
  });
  it("never allows 'unsafe-inline' or 'unsafe-eval' for scripts", () => {
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toMatch(/unsafe-inline|unsafe-eval/);
  });
  it('blocks framing', () => {
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
