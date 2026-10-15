import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RULES,
  buildMailBody,
  fieldValue,
} from '../src/scripts/modules/contact-form/validation.js';

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

test('every rule has a German error message', () => {
  for (const { id, message } of RULES) assert.match(message, /^Bitte /, id);
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
