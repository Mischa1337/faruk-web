/**
 * Bundles and minifies the stylesheets and scripts with esbuild.
 *
 *   src/styles/main.css  →  css/style.css
 *   src/scripts/main.js  →  js/main.js
 *
 * The browser targets decide which vendor prefixes and syntax fallbacks
 * esbuild adds, so the sources can be written in modern, unprefixed CSS
 * and JavaScript.
 *
 * Every bundle gets a content hash. Templates reference the files through
 * the `asset` filter, which appends it (/css/style.css?v=1a2b3c4d), so
 * browsers fetch the new file after every change instead of combining new
 * HTML with a cached old stylesheet.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import * as esbuild from 'esbuild';

export const BROWSER_TARGETS = ['chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'];

const ENTRY_POINTS = {
  'css/style': 'src/styles/main.css',
  'js/main': 'src/scripts/main.js',
};

/** Content hashes of the last build, keyed by public path (e.g. "/css/style.css"). */
const hashes = new Map();

export async function buildAssets(outputDir) {
  const result = await esbuild.build({
    entryPoints: ENTRY_POINTS,
    outdir: outputDir,
    bundle: true,
    minify: true,
    format: 'iife',
    target: BROWSER_TARGETS,
    // Images referenced from CSS are copied as they are, not inlined
    external: ['../img/*'],
    metafile: true,
    logLevel: 'warning',
  });

  hashes.clear();
  for (const file of Object.keys(result.metafile.outputs)) {
    const content = await readFile(file);
    const publicPath = `/${relative(resolve(outputDir), resolve(file)).split(sep).join('/')}`;
    hashes.set(publicPath, createHash('sha256').update(content).digest('hex').slice(0, 8));
  }
}

/** `{{ "/css/style.css" | asset }}` → "/css/style.css?v=<content hash>" */
export function assetUrl(path) {
  const hash = hashes.get(path);
  if (!hash) throw new Error(`Unknown asset "${path}" – is it built by config/assets.js?`);
  return `${path}?v=${hash}`;
}
