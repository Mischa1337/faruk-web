/**
 * Eleventy configuration.
 *
 *   src/         sources (templates, data, styles, scripts, static files)
 *   _site/       generated website – never edit, never commit
 *
 * See ARCHITECTURE.md for an overview.
 */
import { HtmlBasePlugin } from '@11ty/eleventy';
import { buildAssets } from './config/assets.js';
import { registerFilters } from './config/filters.js';

export default function (eleventyConfig) {
  // Static files (images, favicon) are copied unchanged to the site root
  eleventyConfig.addPassthroughCopy({ 'src/public': '/' });

  // CSS and JS are bundled by esbuild before every (re)build
  eleventyConfig.on('eleventy.before', ({ directories }) => buildAssets(directories.output));
  eleventyConfig.addWatchTarget('src/styles/');
  eleventyConfig.addWatchTarget('src/scripts/');

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
