/**
 * Template filters and shortcodes shared by all templates.
 */
import { buildStructuredData } from './structured-data.js';

const ENTITIES = {
  '&amp;': '&',
  '&nbsp;': ' ',
  '&shy;': '',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

/** Removes HTML tags and decodes the few entities used in the content files. */
export function stripTags(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|nbsp|shy|lt|gt|quot);/g, (entity) => ENTITIES[entity]);
}

/**
 * JSON for a <script type="application/ld+json"> block. `<` is escaped so
 * that no content can ever close the script element early.
 */
export function toJsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

/**
 * Fills placeholders in a text from an object:
 * fill("{amount} € for {minutes} min", { amount: 85, minutes: 120 }) → "85 € for 120 min".
 * Lets translated texts carry numbers that are maintained only once.
 */
export function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (placeholder, key) => values[key] ?? placeholder);
}

/** {% icon "name" %} → inline reference to a symbol of the SVG sprite. */
export function icon(name, className = 'ico') {
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

export function registerFilters(eleventyConfig) {
  eleventyConfig.addFilter('stripTags', stripTags);
  eleventyConfig.addFilter('fill', fill);
  eleventyConfig.addFilter('structuredData', (site, offers, pricing, faq, pageUrl, locale) =>
    toJsonLd(
      buildStructuredData({ site, offers, pricing, faq, pageUrl, locale }, { stripTags, fill }),
    ),
  );
  eleventyConfig.addShortcode('icon', icon);
}
