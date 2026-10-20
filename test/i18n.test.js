/**
 * Translations: the localize helper and the completeness of the page texts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGES, localize } from '../config/i18n.js';

test('localize resolves translations anywhere in the data and keeps everything else', () => {
  const data = {
    icon: 'dumbbell',
    title: { de: 'Preise', en: 'Prices' },
    items: [{ amount: 80, label: { de: 'Einzeltermin', en: 'Single session' } }],
    features: { de: ['a', 'b'], en: ['c', 'd'] },
  };
  assert.deepEqual(localize(data, 'en'), {
    icon: 'dumbbell',
    title: 'Prices',
    items: [{ amount: 80, label: 'Single session' }],
    features: ['c', 'd'],
  });
  assert.equal(localize('already localized', 'en'), 'already localized');
});

test('localize stops at a missing translation and says where it is', () => {
  assert.throws(
    () => localize({ hero: { title: { de: 'Training' } } }, 'de'),
    /Missing translation \(en\) at hero\.title/,
  );
});

test('every text in src/_data/text exists in every language', () => {
  const dir = 'src/_data/text';
  const codes = Object.keys(LANGUAGES);
  // Values that are the same in every language and need no translation
  const shared = new Set(['src', 'textValue']);

  const untranslated = (value, path) => {
    if (Array.isArray(value)) {
      return value.flatMap((item, i) => untranslated(item, `${path}[${i}]`));
    }
    if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.every((key) => codes.includes(key))) {
        return codes.filter((code) => !(code in value)).map((code) => `${path} (${code})`);
      }
      return keys.flatMap((key) =>
        shared.has(key) ? [] : untranslated(value[key], `${path}.${key}`),
      );
    }
    return [`${path} (no translation)`];
  };

  for (const file of readdirSync(dir)) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    assert.deepEqual(untranslated(data, file), [], file);
  }
});
