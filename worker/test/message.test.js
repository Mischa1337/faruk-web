import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMessage } from '../src/message.js';

const env = { MAIL_FROM: 'formular@afp-coaching.de', MAIL_TO: 'kontakt@afp-coaching.de' };
const data = {
  name: 'Max Mustermann',
  email: 'max@mail.de',
  telefon: '0641 123456',
  quelle: 'Instagram',
  nachricht: 'Ich möchte stärker werden.',
};

test('goes from the sender mailbox to the fixed recipient', () => {
  const message = buildMessage(data, env);
  assert.deepEqual(message.from, { name: 'AFP-Coaching Website', email: env.MAIL_FROM });
  assert.equal(message.to, env.MAIL_TO);
});

test('replies go to the visitor', () => {
  assert.deepEqual(buildMessage(data, env).reply, { name: data.name, email: data.email });
});

test('uses the same subject and body as the mailto fallback', () => {
  const message = buildMessage(data, env);
  assert.equal(message.subject, 'Anfrage Personal Training – Max Mustermann');
  assert.ok(
    message.text.startsWith(
      'Name: Max Mustermann\nE-Mail: max@mail.de\nTelefon: 0641 123456\nAufmerksam geworden durch: Instagram\n\nIch möchte stärker werden.',
    ),
  );
});

test('ends with a signature that says where the mail comes from', () => {
  const { text } = buildMessage(data, env);
  assert.match(text, /\n-- \nGesendet über das Kontaktformular auf afp-coaching\.de\./);
  assert.match(text, /direkt an max@mail\.de\.$/);
});
