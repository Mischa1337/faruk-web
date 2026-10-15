import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['_site/', 'node_modules/'] },
  js.configs.recommended,
  {
    files: ['src/scripts/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.js', 'config/**/*.js', 'src/_data/**/*.js', 'src/*.11ty.js', 'test/**/*.js'],
    languageOptions: { globals: globals.node },
  },
];
