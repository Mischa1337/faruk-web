import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['_site/', 'node_modules/', 'worker/dist/', 'worker/.wrangler/'] },
  js.configs.recommended,
  {
    files: ['src/scripts/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      '*.js',
      'config/**/*.js',
      'src/_data/**/*.js',
      'src/*.11ty.js',
      'test/**/*.js',
      'worker/test/**/*.js',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Cloudflare Workers offer the same globals as a service worker
    files: ['worker/src/**/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
];
