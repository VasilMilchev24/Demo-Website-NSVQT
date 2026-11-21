import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent / DOM APIs (XSS safety).' },
      ],
    },
  },
];
