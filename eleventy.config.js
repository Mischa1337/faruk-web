/**
 * Eleventy configuration.
 *
 *   src/         sources (templates, data, styles, scripts, photos, static files)
 *   _site/       generated website – never edit, never commit
 *
 * See ARCHITECTURE.md for an overview.
 */
import { parse } from 'node:path';
import { HtmlBasePlugin } from '@11ty/eleventy';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import { assetUrl, buildAssets } from './config/assets.js';
import { registerFilters } from './config/filters.js';

export default function (eleventyConfig) {
  // Static files (logo, favicons, social preview) are copied unchanged to the site root
  eleventyConfig.addPassthroughCopy({ 'src/public': '/' });

  // Photos in src/img/: every <img src="/img/…"> becomes a <picture> with
  // AVIF and WebP in several widths, so phones download a fraction of the
  // original. The `sizes` attribute in the template tells the browser how
  // wide the image is displayed. Leave out width/height there: the plugin
  // adds the real dimensions, and a `width` attribute would limit the output
  // to that single size. The originals are copied as well, so their
  // URLs (e.g. the trainer photo in the structured data) stay valid.
  // The generated files keep the descriptive name of the original
  // (faruk-personal-trainer-giessen-800.webp instead of a hash) – file names
  // are a small signal for image search.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ['avif', 'webp', 'jpeg'],
    widths: [480, 800, 1200],
    filenameFormat: (id, src, width, format) => `${parse(src).name}-${width}.${format}`,
    failOnError: true,
  });
  eleventyConfig.addPassthroughCopy({ 'src/img': '/img' });

  // CSS and JS are bundled by esbuild before every (re)build
  eleventyConfig.on('eleventy.before', ({ directories }) => buildAssets(directories.output));
  eleventyConfig.addWatchTarget('src/styles/');
  eleventyConfig.addWatchTarget('src/scripts/');
  eleventyConfig.addFilter('asset', assetUrl);

  // Escape template output by default; trusted HTML from the data files is marked `| safe`
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });

  // Prefixes root-relative URLs (/css/…) when the site is served from a
  // sub-path, e.g. a GitHub Pages project URL. PATH_PREFIX is set by CI.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addCollection('sitemap', (collections) =>
    collections.getAll().filter((page) => page.data.sitemap),
  );

  registerFilters(eleventyConfig);

  // Template tags and comments leave blank, indented lines behind; tidy them up
  eleventyConfig.addTransform('tidy-whitespace', (content, outputPath) =>
    outputPath?.endsWith('.html')
      ? content.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n')
      : content,
  );
}

export const config = {
  dir: {
    input: 'src',
    output: '_site',
  },
  pathPrefix: process.env.PATH_PREFIX || '/',
  templateFormats: ['njk', '11ty.js'],
  htmlTemplateEngine: 'njk',
};
