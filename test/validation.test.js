import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_LENGTH,
  RULES,
  buildMailBody,
  buildMailSubject,
  fieldValue,
} from '../src/scripts/modules/contact-form/validation.js';
import { STRINGS } from '../src/scripts/lib/strings.js';
import { LANGUAGES } from '../config/i18n.js';

const rule = (id) => RULES.find((r) => r.id === id);

test('name needs at least two characters', () => {
  assert.equal(rule('f-name').isValid(' A '), false);
  assert.equal(rule('f-name').isValid('Al'), true);
});

test('e-mail must look like an address', () => {
  const { isValid } = rule('f-mail');
  for (const bad of ['', 'max', 'max@', 'max@mail', 'max@mail.d', 'max mustermann@mail.de']) {
    assert.equal(isValid(bad), false, bad);
  }
  for (const good of ['max@mail.de', ' max.mustermann+pt@sub.example.com ']) {
    assert.equal(isValid(good), true, good);
  }
});

test('message needs at least ten characters, ignoring surrounding spaces', () => {
  assert.equal(rule('f-msg').isValid('   kurz    '), false);
  assert.equal(rule('f-msg').isValid('Mehr Kraft im Alltag'), true);
});

test('consent must be checked', () => {
  assert.equal(rule('f-consent').isValid(false), false);
  assert.equal(rule('f-consent').isValid(true), true);
});

test('scripts have their texts in every language of the site, with the same keys', () => {
  const keys = (object, prefix = '') =>
    Object.entries(object).flatMap(([key, value]) =>
      typeof value === 'object' ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
    );
  assert.deepEqual(Object.keys(STRINGS).sort(), Object.keys(LANGUAGES).sort());
  for (const strings of Object.values(STRINGS)) {
    assert.deepEqual(keys(strings).sort(), keys(STRINGS.de).sort());
  }
});

test('every rule has an error message in every language', () => {
  for (const [lang, strings] of Object.entries(STRINGS)) {
    for (const { id } of RULES) assert.ok(strings.errors[id], `${lang}: ${id}`);
  }
});

test('fieldValue reads checkboxes by state and other inputs by value', () => {
  assert.equal(fieldValue({ type: 'checkbox', checked: true, value: 'on' }), true);
  assert.equal(fieldValue({ type: 'text', value: 'Hallo' }), 'Hallo');
});

test('fallback mail body lists all fields and marks a missing phone', () => {
  const body = buildMailBody({
    name: 'Max',
    email: 'max@mail.de',
    telefon: '',
    quelle: 'Instagram',
    nachricht: 'Ich möchte stärker werden.',
  });
  assert.equal(
    body,
    'Name: Max\nE-Mail: max@mail.de\nTelefon: –\nAufmerksam geworden durch: Instagram\n\nIch möchte stärker werden.',
  );
});

test('mail subject names the sender and the chosen offer', () => {
  assert.equal(buildMailSubject('Max'), 'Anfrage Personal Training – Max');
  assert.equal(buildMailSubject('Max', '10er-Karte'), 'Anfrage 10er-Karte – Max');
});

test('mail body notes the language of a non-German page first', () => {
  const base = { name: 'Max', email: 'max@mail.de', quelle: 'Instagram', nachricht: 'Hello' };
  assert.ok(
    buildMailBody({ ...base, sprache: 'en', interesse: 'Duo Training' }).startsWith(
      'Sprache: Englisch (Anfrage über die englische Seite)\nInteresse: Duo Training\nName: Max\n',
    ),
  );
  assert.ok(buildMailBody({ ...base, sprache: 'de' }).startsWith('Name: Max\n'));
});

test('mail body starts with the chosen offer when there is one', () => {
  const body = buildMailBody({
    name: 'Max',
    email: 'max@mail.de',
    quelle: 'Instagram',
    nachricht: 'Hallo',
    interesse: 'Duo-Training',
  });
  assert.ok(body.startsWith('Interesse: Duo-Training\nName: Max\n'));
});

test('maxlength in the form matches the limits the worker enforces', () => {
  const markup = readFileSync('src/_includes/partials/contact-form.njk', 'utf8');
  for (const [name, max] of Object.entries(MAX_LENGTH)) {
    const input = markup.match(new RegExp(`<(?:input|textarea)[^>]*name="${name}"[^>]*>`))?.[0];
    assert.ok(input, `field ${name} exists`);
    // Hidden fields are filled by the script, not typed, and take no maxlength
    if (input.includes('type="hidden"')) continue;
    assert.match(input, new RegExp(`maxlength="${max}"`), name);
  }
});
