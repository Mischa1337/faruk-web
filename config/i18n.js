/**
 * Languages of the site and the helper that resolves translated content.
 *
 * Content files hold every visible text in all languages side by side:
 *
 *   "title": { "de": "Preise", "en": "Prices" }
 *
 * `localize` walks a data structure and replaces each such object with the
 * text of one language. Everything else (numbers, URLs, icons, ids) is
 * written once and shared by all languages.
 */

/**
 * German is the main language and lives at the root; every other language
 * gets its own folder (src/en/) whose directory data sets `lang`.
 */
export const LANGUAGES = {
  de: { code: 'de', name: 'Deutsch', locale: 'de_DE', home: '/' },
  en: { code: 'en', name: 'English', locale: 'en_GB', home: '/en/' },
};

export const DEFAULT_LANGUAGE = 'de';

const CODES = Object.keys(LANGUAGES);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** An object whose keys are all language codes is a translation. */
const isTranslation = (value) =>
  isPlainObject(value) &&
  Object.keys(value).length > 0 &&
  Object.keys(value).every((key) => CODES.includes(key));

/**
 * Returns `value` with every translation resolved to `lang`. A translation
 * that lacks a language stops the build, so no page can go out with a
 * missing text. Already localized data passes through unchanged.
 *
 * @param {unknown} value
 * @param {string} lang
 * @param {string} [path] position in the data, for the error message
 */
export function localize(value, lang, path = '') {
  if (Array.isArray(value)) {
    return value.map((item, index) => localize(item, lang, `${path}[${index}]`));
  }
  if (isTranslation(value)) {
    const missing = CODES.filter((code) => !(code in value));
    if (missing.length) {
      throw new Error(`Missing translation (${missing.join(', ')}) at ${path || 'root'}`);
    }
    return value[lang];
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        localize(item, lang, path ? `${path}.${key}` : key),
      ]),
    );
  }
  return value;
}

/** The same page in every language – for hreflang links and the language switch. */
export const homeAlternates = () =>
  Object.values(LANGUAGES).map(({ code, name, home }) => ({ lang: code, name, url: home }));
