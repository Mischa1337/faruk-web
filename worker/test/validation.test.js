import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmission } from '../src/validation.js';

const valid = {
  name: ' Max Mustermann ',
  email: 'max@mail.de',
  telefon: '',
  quelle: 'Instagram',
  nachricht: 'Ich möchte stärker werden.\nAm liebsten abends.',
};

test('accepts a complete submission and trims the values', () => {
  const result = validateSubmission(valid);
  assert.equal(result.ok, true);
  assert.equal(result.data.name, 'Max Mustermann');
  assert.equal(result.data.telefon, '');
});

test('phone is optional, but checked when given', () => {
  const { telefon, ...withoutPhone } = valid;
  assert.equal(telefon, '');
  assert.equal(validateSubmission(withoutPhone).ok, true);
  assert.equal(validateSubmission({ ...valid, telefon: '0641 123456' }).ok, true);
  assert.deepEqual(validateSubmission({ ...valid, telefon: '1'.repeat(41) }).fields, ['telefon']);
});

test('ignores unknown fields such as the honeypot', () => {
  const result = validateSubmission({ ...valid, _gotcha: '', admin: true });
  assert.deepEqual(Object.keys(result.data).sort(), [
    'email',
    'nachricht',
    'name',
    'quelle',
    'telefon',
  ]);
});

test('reports every invalid field', () => {
  const result = validateSubmission({ name: 'M', email: 'max@', quelle: '', nachricht: 'kurz' });
  assert.deepEqual(result, { ok: false, fields: ['name', 'email', 'quelle', 'nachricht'] });
});

test('enforces the maximum lengths', () => {
  assert.deepEqual(validateSubmission({ ...valid, name: 'M'.repeat(101) }).fields, ['name']);
  assert.deepEqual(validateSubmission({ ...valid, nachricht: 'x'.repeat(5001) }).fields, [
    'nachricht',
  ]);
  assert.equal(validateSubmission({ ...valid, nachricht: 'x'.repeat(5000) }).ok, true);
});

test('rejects line breaks in fields that end up in mail headers', () => {
  const injected = 'Max\r\nBcc: victim@example.com';
  assert.deepEqual(validateSubmission({ ...valid, name: injected }).fields, ['name']);
  assert.deepEqual(validateSubmission({ ...valid, email: 'a@b.de\nBcc: c@d.de' }).fields, [
    'email',
  ]);
});

test('rejects control characters', () => {
  assert.deepEqual(
    validateSubmission({ ...valid, nachricht: 'Hallo\u0000 Welt, wie geht es?' }).fields,
    ['nachricht'],
  );
});

test('rejects values that are not strings', () => {
  assert.deepEqual(validateSubmission({ ...valid, name: ['Max', 'Moritz'] }).fields, ['name']);
  assert.deepEqual(validateSubmission({ ...valid, telefon: 123 }).fields, ['telefon']);
});

test('rejects a body that is not an object', () => {
  for (const body of [null, 'text', 42, ['a']]) {
    assert.equal(validateSubmission(body).ok, false, JSON.stringify(body));
  }
});
