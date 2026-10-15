/**
 * Bundles and minifies the stylesheets and scripts with esbuild.
 *
 *   src/styles/main.css  →  css/style.css
 *   src/scripts/main.js  →  js/main.js
 *
 * The browser targets decide which vendor prefixes and syntax fallbacks
 * esbuild adds, so the sources can be written in modern, unprefixed CSS
 * and JavaScript.
 */
import * as esbuild from 'esbuild';

export const BROWSER_TARGETS = ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'];

export async function buildAssets(outputDir) {
  await esbuild.build({
    entryPoints: {
      'css/style': 'src/styles/main.css',
      'js/main': 'src/scripts/main.js',
    },
    outdir: outputDir,
    bundle: true,
    minify: true,
    format: 'iife',
    target: BROWSER_TARGETS,
    // Images referenced from CSS are copied as they are, not inlined
    external: ['../img/*'],
    logLevel: 'warning',
  });
}
